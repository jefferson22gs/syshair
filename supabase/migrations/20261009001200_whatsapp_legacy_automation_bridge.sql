BEGIN;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS whatsapp_outbox_id uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.whatsapp_enqueue_birthdays()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE c record; n integer:=0; BEGIN
 FOR c IN SELECT cl.id,cl.name,cl.phone_normalized,cl.salon_id,s.name salon_name,s.timezone,w.id instance_id
 FROM clients cl JOIN salons s ON s.id=cl.salon_id JOIN whatsapp_instances w ON w.salon_id=s.id
 JOIN whatsapp_automation_settings cfg ON cfg.salon_id=s.id AND cfg.birthday_enabled
 WHERE cl.birth_date IS NOT NULL AND cl.phone_normalized IS NOT NULL AND NOT cl.marketing_opt_out
 AND extract(month FROM cl.birth_date)=extract(month FROM now() AT TIME ZONE s.timezone)
 AND extract(day FROM cl.birth_date)=extract(day FROM now() AT TIME ZONE s.timezone)
 AND NOT EXISTS(SELECT 1 FROM whatsapp_marketing_suppression b WHERE b.salon_id=cl.salon_id AND b.phone=cl.phone_normalized) LOOP
 INSERT INTO whatsapp_outbox(salon_id,instance_id,idempotency_key,category,recipient_phone,text_content)
 VALUES(c.salon_id,c.instance_id,'birthday:'||c.id::text||':'||(now() AT TIME ZONE c.timezone)::date::text,'marketing',c.phone_normalized,'Olá, '||c.name||'! O '||c.salon_name||' deseja um feliz aniversário!')
 ON CONFLICT(salon_id,idempotency_key) DO NOTHING;
 n:=n+1;
 END LOOP;
 RETURN n;
END $$;

-- Notificações legadas transacionais explícitas, nunca campanha sem consentimento e nunca sent sem outbox.
CREATE OR REPLACE FUNCTION public.whatsapp_bridge_notifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE r record; v_instance uuid; v_outbox uuid; n integer:=0; BEGIN
 FOR r IN SELECT * FROM notifications WHERE channel='whatsapp' AND status IN('pending','scheduled') AND whatsapp_outbox_id IS NULL
 AND coalesce(scheduled_for,now())<=now() ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED LOOP
 IF r.type NOT IN('appointment_reminder','appointment_confirmed','appointment_cancelled','appointment_rescheduled') OR r.phone !~ '^\+[1-9][0-9]{6,14}$' THEN
  UPDATE notifications SET status='failed',error_message='Automação legada precisa de revisão/normalização antes de enviar.' WHERE id=r.id;
  CONTINUE;
 END IF;
 IF r.appointment_id IS NULL OR NOT EXISTS(SELECT 1 FROM appointments a WHERE a.id=r.appointment_id AND a.salon_id=r.salon_id AND a.client_phone=r.phone AND a.status IN('pending','confirmed')) THEN
  UPDATE notifications SET status='failed',error_message='Agendamento ausente ou não ativo.' WHERE id=r.id; CONTINUE;
 END IF;
 SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=r.salon_id;
 IF v_instance IS NULL THEN CONTINUE; END IF;
 INSERT INTO whatsapp_outbox(salon_id,instance_id,appointment_id,idempotency_key,category,recipient_phone,text_content,scheduled_for,expected_appointment_version)
 SELECT r.salon_id,v_instance,r.appointment_id,'notification:'||r.id::text,'transactional',r.phone,r.message,coalesce(r.scheduled_for,now()),a.updated_at FROM appointments a WHERE a.id=r.appointment_id AND a.salon_id=r.salon_id
 ON CONFLICT(salon_id,idempotency_key) DO UPDATE SET id=whatsapp_outbox.id RETURNING id INTO v_outbox;
 UPDATE notifications SET whatsapp_outbox_id=v_outbox,status='queued' WHERE id=r.id;
 n:=n+1;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_sync_notification_outbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 UPDATE notifications SET status=CASE WHEN NEW.status IN('accepted','delivered','read') THEN 'sent' ELSE NEW.status END,
 sent_at=CASE WHEN NEW.status IN('accepted','delivered','read') THEN coalesce(sent_at,now()) ELSE sent_at END,error_message=NEW.error_code
 WHERE whatsapp_outbox_id=NEW.id AND NEW.status<>'processing';
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_sync_notification_outbox AFTER UPDATE OF status ON whatsapp_outbox FOR EACH ROW EXECUTE FUNCTION whatsapp_sync_notification_outbox();

-- Caminho antigo da confirmação faz somente enqueue; dados são relidos do banco, sem confiar no body HTTP.
CREATE OR REPLACE FUNCTION public.whatsapp_enqueue_confirmation(p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE a appointments;cfg whatsapp_automation_settings; v_instance uuid; v_text text; BEGIN
 SELECT * INTO a FROM appointments WHERE id=p_appointment_id;
 IF NOT FOUND OR a.status NOT IN('pending','confirmed') OR a.client_phone !~ '^\+[1-9][0-9]{6,14}$' THEN RETURN; END IF;
 SELECT * INTO cfg FROM whatsapp_automation_settings WHERE salon_id=a.salon_id;
 IF NOT FOUND OR NOT cfg.confirmation_enabled THEN RETURN; END IF;
 SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=a.salon_id;
 IF v_instance IS NULL THEN RETURN; END IF;
 SELECT CASE WHEN a.status='pending' THEN 'Recebemos sua solicitação. Aguarde a confirmação do salão.' ELSE 'Seu agendamento está confirmado.' END||E'\n'||s.name||' — '||sv.name||E'\n'||to_char(a.date,'DD/MM/YYYY')||' às '||to_char(a.start_time,'HH24:MI') INTO v_text
 FROM salons s JOIN services sv ON sv.salon_id=s.id WHERE s.id=a.salon_id AND sv.id=a.service_id;
 INSERT INTO whatsapp_outbox(salon_id,instance_id,appointment_id,idempotency_key,category,recipient_phone,text_content,expected_appointment_version)
 VALUES(a.salon_id,v_instance,a.id,'appointment:'||a.id::text||':created:'||a.updated_at::text,'transactional',a.client_phone,v_text,a.updated_at)
 ON CONFLICT(salon_id,idempotency_key) DO NOTHING;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('whatsapp_enqueue_birthdays','whatsapp_bridge_notifications','whatsapp_sync_notification_outbox','whatsapp_enqueue_confirmation') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
