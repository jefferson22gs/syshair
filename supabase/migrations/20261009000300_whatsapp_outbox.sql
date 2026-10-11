BEGIN;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_normalized text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
CREATE INDEX IF NOT EXISTS clients_phone_normalized_lookup ON public.clients(salon_id,phone_normalized) WHERE phone_normalized IS NOT NULL;

CREATE TABLE public.whatsapp_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
 instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
 appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
 source_event_id uuid REFERENCES public.whatsapp_webhook_events(id) ON DELETE SET NULL,
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 200),
 category text NOT NULL CHECK(category IN ('transactional','chatbot','administrative','marketing','status')),
 recipient_phone text CHECK(recipient_phone ~ '^\+[1-9][0-9]{6,14}$'),
 content_type text NOT NULL DEFAULT 'text' CHECK(content_type IN ('text','image','video','document','status_text','status_image','status_video')),
 text_content text NOT NULL DEFAULT '',
 media_path text,
 media_mime text,
 media_filename text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','delivered','read','failed','cancelled','uncertain')),
 scheduled_for timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 5),
 claim_token uuid,
 lease_until timestamptz,
 send_started_at timestamptz,
 remote_message_id text,
 error_code text,
 expected_appointment_version timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(salon_id,idempotency_key)
);
CREATE INDEX whatsapp_outbox_due ON public.whatsapp_outbox(scheduled_for,created_at) WHERE status='pending';
CREATE UNIQUE INDEX whatsapp_outbox_remote_id ON public.whatsapp_outbox(instance_id,remote_message_id) WHERE remote_message_id IS NOT NULL;
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read outbox" ON public.whatsapp_outbox FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.salons s WHERE s.id=whatsapp_outbox.salon_id AND s.owner_id=auth.uid()));
CREATE POLICY "Workers manage outbox" ON public.whatsapp_outbox FOR ALL TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.whatsapp_outbox FROM anon,authenticated;
GRANT SELECT ON public.whatsapp_outbox TO authenticated;
GRANT ALL ON public.whatsapp_outbox TO service_role;

-- Mutex/rate gate único compartilhado por todos os consumidores de uma instância.
CREATE TABLE whatsapp_private.instance_dispatch (
 instance_id uuid PRIMARY KEY REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
 next_available_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON whatsapp_private.instance_dispatch FROM PUBLIC,anon,authenticated;
GRANT ALL ON whatsapp_private.instance_dispatch TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_claim_outbox()
RETURNS SETOF public.whatsapp_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$
DECLARE v_id uuid; v_instance uuid;
BEGIN
 UPDATE whatsapp_outbox SET status=CASE WHEN send_started_at IS NULL AND attempts<max_attempts THEN 'pending' ELSE 'uncertain' END,
 error_code=CASE WHEN send_started_at IS NULL THEN 'lease_expired_before_send' ELSE 'result_unknown_after_restart' END,
 claim_token=NULL,lease_until=NULL WHERE status='processing' AND lease_until<now();
 INSERT INTO whatsapp_private.instance_dispatch(instance_id)
 SELECT DISTINCT instance_id FROM whatsapp_outbox WHERE status='pending' ON CONFLICT DO NOTHING;
 SELECT o.id,o.instance_id INTO v_id,v_instance FROM whatsapp_outbox o
 JOIN whatsapp_private.instance_dispatch gate ON gate.instance_id=o.instance_id
 WHERE o.status='pending' AND o.scheduled_for<=now() AND o.attempts<o.max_attempts AND gate.next_available_at<=now()
 AND NOT EXISTS(SELECT 1 FROM whatsapp_outbox busy WHERE busy.instance_id=o.instance_id AND busy.status='processing' AND busy.lease_until>now())
 ORDER BY o.scheduled_for,o.created_at LIMIT 1 FOR UPDATE OF o,gate SKIP LOCKED;
 IF v_id IS NULL THEN RETURN; END IF;
 UPDATE whatsapp_private.instance_dispatch SET next_available_at=now()+interval '3 seconds' WHERE instance_id=v_instance;
 RETURN QUERY UPDATE whatsapp_outbox SET status='processing',attempts=attempts+1,
 claim_token=gen_random_uuid(),lease_until=now()+interval '90 seconds',send_started_at=NULL
 WHERE id=v_id RETURNING *;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_begin_send(p_id uuid,p_claim uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE n integer;
BEGIN
 UPDATE whatsapp_outbox SET send_started_at=now() WHERE id=p_id AND claim_token=p_claim
 AND status='processing' AND lease_until>now() AND send_started_at IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n=1;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_finish_outbox(p_id uuid,p_claim uuid,p_status text,p_message_id text DEFAULT NULL,p_error_code text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$
DECLARE n integer;
BEGIN
 IF p_status NOT IN('accepted','failed','cancelled','uncertain','pending') THEN RAISE EXCEPTION 'invalid status'; END IF;
 -- WhatsApp desconectado antes de qualquer envio não é falha da mensagem: devolve a tentativa
 -- e pausa a instância. A campanha retoma sozinha após reconectar, sem esgotar retries.
 IF p_status='pending' AND p_error_code='disconnected' THEN
  UPDATE whatsapp_outbox SET status='pending',attempts=GREATEST(attempts-1,0),error_code='disconnected',
   claim_token=NULL,lease_until=NULL,scheduled_for=now()+interval '5 minutes',completed_at=NULL
  WHERE id=p_id AND claim_token=p_claim AND status='processing' AND send_started_at IS NULL;
  GET DIAGNOSTICS n=ROW_COUNT;
  UPDATE whatsapp_private.instance_dispatch SET next_available_at=now()+interval '5 minutes'
  WHERE instance_id=(SELECT instance_id FROM whatsapp_outbox WHERE id=p_id);
  IF n=1 THEN RETURN true; END IF;
 END IF;
 UPDATE whatsapp_outbox SET status=CASE WHEN p_status='pending' AND attempts>=max_attempts THEN 'failed' ELSE p_status END,
 remote_message_id=p_message_id,error_code=p_error_code,claim_token=NULL,lease_until=NULL,
 scheduled_for=CASE WHEN p_status='pending' THEN now()+make_interval(secs=>LEAST(900,30*power(2,attempts)::integer)) ELSE scheduled_for END,
 completed_at=CASE WHEN p_status='pending' THEN NULL ELSE now() END
 WHERE id=p_id AND claim_token=p_claim AND status='processing';
 GET DIAGNOSTICS n=ROW_COUNT;
 -- Não manter throughput agressivo depois de erro remoto.
 IF p_error_code='provider_rate_limited' THEN
 UPDATE whatsapp_private.instance_dispatch SET next_available_at=now()+interval '5 minutes'
 WHERE instance_id=(SELECT instance_id FROM whatsapp_outbox WHERE id=p_id);
 END IF;
 RETURN n=1;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_record_delivery(p_salon_id uuid,p_instance_id uuid,p_message_id text,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 IF p_status NOT IN('delivered','read') THEN RETURN; END IF;
 UPDATE whatsapp_outbox SET status=p_status
 WHERE salon_id=p_salon_id AND instance_id=p_instance_id AND remote_message_id=p_message_id
 AND (status='accepted' OR (p_status='read' AND status='delivered'));
 UPDATE broadcast_messages SET status=p_status
 WHERE salon_id=p_salon_id AND whatsapp_message_id=p_message_id
 AND (status='sent' OR (p_status='read' AND status='delivered'));
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('whatsapp_claim_outbox','whatsapp_begin_send','whatsapp_finish_outbox','whatsapp_record_delivery') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
