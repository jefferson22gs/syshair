BEGIN;
CREATE TABLE whatsapp_private.chatbot_secrets(
 salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
 api_key text NOT NULL CHECK(length(api_key) BETWEEN 1 AND 500),
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON whatsapp_private.chatbot_secrets FROM PUBLIC,anon,authenticated;
GRANT ALL ON whatsapp_private.chatbot_secrets TO service_role;
INSERT INTO whatsapp_private.chatbot_secrets(salon_id,api_key)
SELECT salon_id,api_key FROM public.chatbot_settings WHERE api_key IS NOT NULL AND api_key<>'' ON CONFLICT DO NOTHING;
UPDATE public.chatbot_settings SET api_key=NULL;
CREATE OR REPLACE FUNCTION public.whatsapp_chatbot_secret(p_salon_id uuid)
RETURNS TABLE(api_key text) LANGUAGE sql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$ SELECT s.api_key FROM whatsapp_private.chatbot_secrets s WHERE s.salon_id=p_salon_id $$;
CREATE OR REPLACE FUNCTION public.whatsapp_save_chatbot_secret(p_salon_id uuid,p_api_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$ BEGIN
 IF length(p_api_key) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid_key'; END IF;
 INSERT INTO whatsapp_private.chatbot_secrets(salon_id,api_key) VALUES(p_salon_id,p_api_key)
 ON CONFLICT(salon_id) DO UPDATE SET api_key=p_api_key,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_chatbot_secret(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_save_chatbot_secret(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_chatbot_secret(uuid),public.whatsapp_save_chatbot_secret(uuid,text) TO service_role;

-- Evita escrita accidental de nova chave na coluna legada ainda presente nos tipos.
CREATE FUNCTION public.whatsapp_block_public_chatbot_secret() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.api_key IS NOT NULL THEN RAISE EXCEPTION 'Use configuração privada de credenciais'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_block_public_chatbot_secret BEFORE INSERT OR UPDATE ON public.chatbot_settings
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_block_public_chatbot_secret();

CREATE TABLE public.whatsapp_marketing_suppression(
 salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 phone text NOT NULL CHECK(phone ~ '^\+[1-9][0-9]{6,14}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(salon_id,phone)
);
ALTER TABLE public.whatsapp_marketing_suppression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads suppression" ON public.whatsapp_marketing_suppression FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM salons s WHERE s.id=whatsapp_marketing_suppression.salon_id AND s.owner_id=auth.uid()));
CREATE POLICY "Worker suppression" ON public.whatsapp_marketing_suppression FOR ALL TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.whatsapp_marketing_suppression FROM anon,authenticated;
GRANT SELECT ON public.whatsapp_marketing_suppression TO authenticated;
GRANT ALL ON public.whatsapp_marketing_suppression TO service_role;
CREATE OR REPLACE FUNCTION public.whatsapp_set_marketing_opt_out(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE e whatsapp_webhook_events; BEGIN
 SELECT * INTO e FROM whatsapp_webhook_events WHERE id=p_event_id AND status='processing';
 IF NOT FOUND THEN RAISE EXCEPTION 'event_missing'; END IF;
 INSERT INTO whatsapp_marketing_suppression(salon_id,phone) VALUES(e.salon_id,e.sender_phone) ON CONFLICT DO NOTHING;
 UPDATE clients SET marketing_opt_out=true WHERE salon_id=e.salon_id AND phone_normalized=e.sender_phone;
 UPDATE whatsapp_outbox SET status='cancelled',error_code='marketing_opt_out',claim_token=NULL,lease_until=NULL,completed_at=now()
 WHERE salon_id=e.salon_id AND recipient_phone=e.sender_phone AND category='marketing' AND (status='pending' OR(status='processing' AND send_started_at IS NULL));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_set_marketing_opt_out(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_set_marketing_opt_out(uuid) TO service_role;
COMMIT;
