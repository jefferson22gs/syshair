BEGIN;
CREATE TABLE public.whatsapp_automation_settings (
 salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
 confirmation_enabled boolean NOT NULL DEFAULT false,
 reminders_enabled boolean NOT NULL DEFAULT false,
 reminder_minutes integer[] NOT NULL DEFAULT ARRAY[1440,120],
 cancellation_enabled boolean NOT NULL DEFAULT false,
 reschedule_enabled boolean NOT NULL DEFAULT false,
 birthday_enabled boolean NOT NULL DEFAULT false,
 chatbot_booking_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(cardinality(reminder_minutes)<=5 AND reminder_minutes <@ ARRAY[15,30,60,120,180,360,720,1440,2880])
);
ALTER TABLE public.whatsapp_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner automation preferences" ON public.whatsapp_automation_settings FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM salons s WHERE s.id=salon_id AND s.owner_id=auth.uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM salons s WHERE s.id=salon_id AND s.owner_id=auth.uid()));
CREATE POLICY "Worker automation preferences" ON public.whatsapp_automation_settings FOR ALL TO service_role USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE ON public.whatsapp_automation_settings TO authenticated;
GRANT ALL ON public.whatsapp_automation_settings TO service_role;

-- Novos avisos sempre falsos até o dono habilitar; sem ativação silenciosa em salões existentes.
CREATE OR REPLACE FUNCTION public.whatsapp_enqueue_appointment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE cfg whatsapp_automation_settings; v_instance uuid; v_type text; v_text text; v_phone text;
 v_service text; v_salon text; v_professional text;
BEGIN
 SELECT * INTO cfg FROM whatsapp_automation_settings WHERE salon_id=NEW.salon_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=NEW.salon_id;
 IF v_instance IS NULL THEN RETURN NEW; END IF;
 v_phone:=CASE WHEN NEW.client_phone ~ '^\+[1-9][0-9]{6,14}$' THEN NEW.client_phone ELSE NULL END;
 IF v_phone IS NULL THEN RETURN NEW; END IF; -- worker/backfill normaliza legado; não inventar país.
 IF TG_OP='INSERT' AND cfg.confirmation_enabled THEN v_type:='created';
 ELSIF TG_OP='UPDATE' AND NEW.status='cancelled' AND OLD.status IS DISTINCT FROM NEW.status AND cfg.cancellation_enabled THEN v_type:='cancelled';
 ELSIF TG_OP='UPDATE' AND NEW.status='confirmed' AND OLD.status IS DISTINCT FROM NEW.status AND cfg.confirmation_enabled THEN v_type:='confirmed';
 ELSIF TG_OP='UPDATE' AND (OLD.date IS DISTINCT FROM NEW.date OR OLD.start_time IS DISTINCT FROM NEW.start_time) AND cfg.reschedule_enabled THEN v_type:='rescheduled';
 ELSE RETURN NEW; END IF;
 SELECT name INTO v_salon FROM salons WHERE id=NEW.salon_id;
 SELECT name INTO v_service FROM services WHERE id=NEW.service_id AND salon_id=NEW.salon_id;
 SELECT name INTO v_professional FROM professionals WHERE id=NEW.professional_id AND salon_id=NEW.salon_id;
 v_text:='Olá, '||coalesce(NEW.client_name,'cliente')||'! '||CASE WHEN v_type='cancelled' THEN 'Seu agendamento foi cancelado.' WHEN NEW.status='pending' THEN 'Recebemos sua solicitação de agendamento. Ela aguarda confirmação do salão.' ELSE 'Seu agendamento está confirmado.' END
 ||E'\nSalão: '||coalesce(v_salon,'Salão')||E'\nServiço: '||coalesce(v_service,'Serviço')||E'\nProfissional: '||coalesce(v_professional,'Profissional')||E'\nData: '||to_char(NEW.date,'DD/MM/YYYY')||' às '||to_char(NEW.start_time,'HH24:MI');
 INSERT INTO whatsapp_outbox(salon_id,instance_id,appointment_id,idempotency_key,category,recipient_phone,text_content,expected_appointment_version)
 VALUES(NEW.salon_id,v_instance,NEW.id,'appointment:'||NEW.id::text||':'||v_type||':'||NEW.updated_at::text,'transactional',v_phone,v_text,NEW.updated_at)
 ON CONFLICT(salon_id,idempotency_key) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_enqueue_appointment_event AFTER INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.whatsapp_enqueue_appointment_event();

CREATE OR REPLACE FUNCTION public.whatsapp_enqueue_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE a record; m integer; n integer:=0; k text; BEGIN
 FOR a IN SELECT ap.*,s.timezone,s.name salon_name,sv.name service_name,w.id instance_id,cfg.reminder_minutes
 FROM appointments ap JOIN salons s ON s.id=ap.salon_id
 JOIN services sv ON sv.id=ap.service_id AND sv.salon_id=ap.salon_id
 JOIN whatsapp_instances w ON w.salon_id=ap.salon_id
 JOIN whatsapp_automation_settings cfg ON cfg.salon_id=ap.salon_id AND cfg.reminders_enabled
 WHERE ap.status IN('pending','confirmed') AND ap.client_phone ~ '^\+[1-9][0-9]{6,14}$'
 AND (ap.date+ap.start_time) AT TIME ZONE s.timezone>now()
 AND (ap.date+ap.start_time) AT TIME ZONE s.timezone<=now()+interval '2 days' LOOP
  FOREACH m IN ARRAY a.reminder_minutes LOOP
   -- Agendamento criado dentro da janela: lembrete "24h antes" já passou, não disparar imediatamente.
   CONTINUE WHEN ((a.date+a.start_time) AT TIME ZONE a.timezone)-make_interval(mins=>m) <= now();
   k:='reminder:'||a.id::text||':'||a.updated_at::text||':'||m::text;
   INSERT INTO whatsapp_outbox(salon_id,instance_id,appointment_id,idempotency_key,category,recipient_phone,text_content,scheduled_for,expected_appointment_version)
   VALUES(a.salon_id,a.instance_id,a.id,k,'transactional',a.client_phone,
    'Lembrete: '||a.service_name||' no '||a.salon_name||' em '||to_char(a.date,'DD/MM/YYYY')||' às '||to_char(a.start_time,'HH24:MI')||CASE WHEN a.status='pending' THEN '. Solicitação ainda pendente de confirmação.' ELSE '. Até breve!' END,
    ((a.date+a.start_time) AT TIME ZONE a.timezone)-make_interval(mins=>m),a.updated_at)
   ON CONFLICT(salon_id,idempotency_key) DO NOTHING;
   n:=n+1;
  END LOOP;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_conversation_takeover(p_salon_id uuid,p_phone text,p_pause boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM salons WHERE id=p_salon_id AND owner_id=auth.uid()) OR p_phone !~ '^\+[1-9][0-9]{6,14}$' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 INSERT INTO whatsapp_conversation_state(salon_id,phone,human_takeover,taken_over_by,taken_over_at)
 VALUES(p_salon_id,p_phone,p_pause,auth.uid(),now()) ON CONFLICT(salon_id,phone)
 DO UPDATE SET human_takeover=p_pause,taken_over_by=auth.uid(),taken_over_at=now(),updated_at=now(),pending_action=NULL,pending_action_expires_at=NULL;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_conversation_takeover(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_conversation_takeover(uuid,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_enqueue_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_enqueue_reminders() TO service_role;
REVOKE ALL ON FUNCTION public.whatsapp_enqueue_appointment_event() FROM PUBLIC,anon,authenticated;
COMMIT;
