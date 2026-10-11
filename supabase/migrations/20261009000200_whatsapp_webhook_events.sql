BEGIN;
CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type='messages.upsert'),
  provider_message_id text NOT NULL CHECK(length(provider_message_id) BETWEEN 1 AND 160),
  sender_phone text NOT NULL CHECK(sender_phone ~ '^\+[1-9][0-9]{6,14}$'),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed','uncertain','ignored')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claim_token uuid,
  lease_until timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(instance_id,event_type,provider_message_id)
);
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Webhook workers only" ON public.whatsapp_webhook_events FOR ALL TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.whatsapp_webhook_events FROM anon,authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
CREATE INDEX whatsapp_webhook_events_pending ON public.whatsapp_webhook_events(next_attempt_at,created_at) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.whatsapp_claim_inbound()
RETURNS SETOF public.whatsapp_webhook_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 -- Crash anterior ao envio pode ser retomado: consumidor só cria outbox idempotente, nunca envia diretamente.
 UPDATE whatsapp_webhook_events SET status='pending',claim_token=NULL,lease_until=NULL
 WHERE status='processing' AND lease_until<now() AND attempts<3;
 -- Esgotou tentativas travado: encerra para não ficar "processing" eternamente.
 UPDATE whatsapp_webhook_events SET status='failed',claim_token=NULL,lease_until=NULL
 WHERE status='processing' AND lease_until<now() AND attempts>=3;
 RETURN QUERY
 WITH candidate AS (
  SELECT e.id FROM whatsapp_webhook_events e WHERE status='pending' AND next_attempt_at<=now() AND attempts<3
  ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
 )
 UPDATE whatsapp_webhook_events e SET status='processing',claim_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=e.attempts+1
 FROM candidate c WHERE e.id=c.id RETURNING e.*;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_claim_inbound() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_claim_inbound() TO service_role;

CREATE TABLE public.whatsapp_conversation_state (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
 phone text NOT NULL CHECK(phone ~ '^\+[1-9][0-9]{6,14}$'),
 human_takeover boolean NOT NULL DEFAULT false,
 taken_over_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 taken_over_at timestamptz,
 pending_action jsonb,
 pending_action_expires_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(salon_id,phone)
);
ALTER TABLE public.whatsapp_conversation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Salon admins read conversation state" ON public.whatsapp_conversation_state
 FOR SELECT TO authenticated USING(public.user_belongs_to_salon(salon_id));
CREATE POLICY "Workers manage conversation state" ON public.whatsapp_conversation_state
 FOR ALL TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.whatsapp_conversation_state FROM anon,authenticated;
GRANT SELECT ON public.whatsapp_conversation_state TO authenticated;
GRANT ALL ON public.whatsapp_conversation_state TO service_role;
COMMIT;
