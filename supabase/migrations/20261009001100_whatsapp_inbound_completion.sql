BEGIN;
-- Legado sem idempotência gravou o mesmo evento várias vezes. Mantém as linhas
-- (histórico) e desvincula o ID das cópias para o índice único poder existir.
UPDATE public.chatbot_conversations c SET whatsapp_message_id = NULL
FROM (
  SELECT id, row_number() OVER (PARTITION BY salon_id, whatsapp_message_id ORDER BY created_at, id) rn
  FROM public.chatbot_conversations WHERE whatsapp_message_id IS NOT NULL
) d
WHERE c.id = d.id AND d.rn > 1;
CREATE UNIQUE INDEX IF NOT EXISTS chatbot_inbound_message_unique ON public.chatbot_conversations(salon_id,whatsapp_message_id)
 WHERE whatsapp_message_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.whatsapp_finish_inbound(p_event_id uuid,p_claim uuid,p_response text,p_provider text,p_model text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE e whatsapp_webhook_events; BEGIN
 SELECT * INTO e FROM whatsapp_webhook_events WHERE id=p_event_id AND claim_token=p_claim AND status='processing' AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO chatbot_conversations(salon_id,client_phone,client_name,direction,content,whatsapp_message_id)
 VALUES(e.salon_id,e.sender_phone,e.payload->>'name','incoming',e.payload->>'text',e.provider_message_id)
 ON CONFLICT(salon_id,whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL DO NOTHING;
 IF length(p_response)>0 THEN
  INSERT INTO whatsapp_outbox(salon_id,instance_id,source_event_id,idempotency_key,category,recipient_phone,text_content)
  VALUES(e.salon_id,e.instance_id,e.id,'inbound-reply:'||e.id::text,'chatbot',e.sender_phone,left(p_response,4096))
  ON CONFLICT(salon_id,idempotency_key) DO NOTHING;
 END IF;
 UPDATE whatsapp_webhook_events SET status=CASE WHEN length(p_response)>0 THEN 'completed' ELSE 'ignored' END,claim_token=NULL,lease_until=NULL,completed_at=now() WHERE id=e.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_finish_inbound(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_finish_inbound(uuid,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_save_outgoing_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 IF NEW.category='chatbot' AND NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.remote_message_id IS NOT NULL THEN
  INSERT INTO chatbot_conversations(salon_id,client_phone,direction,content,whatsapp_message_id,ai_response,status)
  VALUES(NEW.salon_id,NEW.recipient_phone,'outgoing',NEW.text_content,NEW.remote_message_id,true,'sent')
  ON CONFLICT(salon_id,whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_save_outgoing_history ON public.whatsapp_outbox;
CREATE TRIGGER whatsapp_save_outgoing_history AFTER UPDATE OF status ON public.whatsapp_outbox FOR EACH ROW EXECUTE FUNCTION public.whatsapp_save_outgoing_history();
REVOKE ALL ON FUNCTION public.whatsapp_save_outgoing_history() FROM PUBLIC,anon,authenticated;
COMMIT;
