BEGIN;
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.broadcasts DROP CONSTRAINT IF EXISTS broadcasts_status_check;
ALTER TABLE public.broadcasts ADD CONSTRAINT broadcasts_status_check CHECK(status IN('pending','scheduled','processing','completed','stopped','failed','uncertain'));
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS media_path text;
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';
CREATE UNIQUE INDEX IF NOT EXISTS broadcasts_submission_unique ON public.broadcasts(salon_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.broadcast_queue ADD COLUMN IF NOT EXISTS outbox_id uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL;
ALTER TABLE public.broadcast_queue ADD COLUMN IF NOT EXISTS whatsapp_message_id text;
ALTER TABLE public.broadcast_queue DROP CONSTRAINT IF EXISTS broadcast_queue_status_check;
ALTER TABLE public.broadcast_queue ADD CONSTRAINT broadcast_queue_status_check CHECK(status IN ('pending','processing','sent','failed','cancelled','uncertain'));
CREATE UNIQUE INDEX broadcast_queue_outbox_unique ON public.broadcast_queue(outbox_id) WHERE outbox_id IS NOT NULL;
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.broadcast_queue(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX broadcast_messages_queue_unique ON public.broadcast_messages(queue_id) WHERE queue_id IS NOT NULL;
ALTER TABLE public.broadcast_messages DROP CONSTRAINT IF EXISTS broadcast_messages_status_check;
ALTER TABLE public.broadcast_messages ADD CONSTRAINT broadcast_messages_status_check CHECK(status IN ('pending','sent','failed','delivered','read','cancelled','uncertain'));

-- Criação atômica: pai, itens e outbox. Identidade normalizada por destinatário.
CREATE OR REPLACE FUNCTION public.whatsapp_create_campaign(
 p_salon_id uuid,p_submission uuid,p_message text,p_recipients jsonb,p_scheduled_for timestamptz,
 p_content_type text DEFAULT 'text',p_media_path text DEFAULT NULL,p_media_mime text DEFAULT NULL,p_media_filename text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_campaign uuid; v_instance uuid; v_rec record; v_outbox uuid; v_queue uuid; v_count integer; v_timezone text;
BEGIN
 IF p_content_type NOT IN('text','image','video','document') OR length(p_message)>4096 OR jsonb_typeof(p_recipients)<>'array'
 OR jsonb_array_length(p_recipients) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_campaign'; END IF;
 IF p_scheduled_for IS NULL OR p_scheduled_for>now()+interval '1 year' THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
 IF p_content_type<>'text' AND (p_media_path IS NULL OR split_part(p_media_path,'/',1)<>p_salon_id::text OR p_media_path LIKE '%..%') THEN RAISE EXCEPTION 'invalid_media'; END IF;
 SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=p_salon_id;
 IF v_instance IS NULL THEN RAISE EXCEPTION 'instance_missing'; END IF;
 SELECT timezone INTO v_timezone FROM salons WHERE id=p_salon_id;
 INSERT INTO broadcasts(salon_id,message,total_recipients,sent_count,failed_count,status,scheduled_for,idempotency_key,content_type,media_path,timezone)
 VALUES(p_salon_id,p_message,0,0,0,CASE WHEN p_scheduled_for>now() THEN 'scheduled' ELSE 'processing' END,p_scheduled_for,p_submission,p_content_type,p_media_path,v_timezone)
 ON CONFLICT(salon_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id INTO v_campaign;
 IF v_campaign IS NULL THEN SELECT id INTO v_campaign FROM broadcasts WHERE salon_id=p_salon_id AND idempotency_key=p_submission; RETURN v_campaign; END IF;
 FOR v_rec IN SELECT DISTINCT ON(phone) phone,name,text FROM jsonb_to_recordset(p_recipients) AS r(phone text,name text,text text) ORDER BY phone LOOP
  IF v_rec.phone !~ '^\+[1-9][0-9]{6,14}$' OR length(v_rec.text) NOT BETWEEN 1 AND 4096 THEN RAISE EXCEPTION 'invalid_recipient'; END IF;
  IF EXISTS(SELECT 1 FROM clients WHERE salon_id=p_salon_id AND phone_normalized=v_rec.phone AND marketing_opt_out) THEN CONTINUE; END IF;
  INSERT INTO whatsapp_outbox(salon_id,instance_id,idempotency_key,category,recipient_phone,content_type,text_content,media_path,media_mime,media_filename,scheduled_for)
  VALUES(p_salon_id,v_instance,'campaign:'||v_campaign::text||':'||v_rec.phone,'marketing',v_rec.phone,p_content_type,v_rec.text,p_media_path,p_media_mime,p_media_filename,p_scheduled_for)
  RETURNING id INTO v_outbox;
  INSERT INTO broadcast_queue(broadcast_id,salon_id,recipient_phone,recipient_name,message,status,scheduled_for,outbox_id)
  VALUES(v_campaign,p_salon_id,v_rec.phone,v_rec.name,v_rec.text,'pending',p_scheduled_for,v_outbox) RETURNING id INTO v_queue;
  INSERT INTO broadcast_messages(broadcast_id,salon_id,recipient_phone,recipient_name,status,queue_id)
  VALUES(v_campaign,p_salon_id,v_rec.phone,v_rec.name,'pending',v_queue);
 END LOOP;
 SELECT count(*) INTO v_count FROM broadcast_queue WHERE broadcast_id=v_campaign;
 UPDATE broadcasts SET total_recipients=v_count,status=CASE WHEN v_count=0 THEN 'failed' ELSE status END,
 error_message=CASE WHEN v_count=0 THEN 'Nenhum destinatário autorizado.' ELSE NULL END WHERE id=v_campaign;
 RETURN v_campaign;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_cancel_campaign(p_campaign_id uuid,p_salon_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE n integer; BEGIN
 PERFORM 1 FROM broadcasts WHERE id=p_campaign_id AND salon_id=p_salon_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'campaign_missing'; END IF;
 UPDATE broadcasts SET status='stopped',last_activity_at=now() WHERE id=p_campaign_id AND status NOT IN('completed','failed');
 UPDATE whatsapp_outbox o SET status='cancelled',error_code='campaign_cancelled',completed_at=now(),claim_token=NULL,lease_until=NULL
 FROM broadcast_queue q WHERE q.outbox_id=o.id AND q.broadcast_id=p_campaign_id AND q.salon_id=p_salon_id
 AND (o.status='pending' OR (o.status='processing' AND o.send_started_at IS NULL));
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_sync_campaign_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE v_campaign uuid; v_status text; BEGIN
 SELECT broadcast_id INTO v_campaign FROM broadcast_queue WHERE outbox_id=NEW.id;
 IF v_campaign IS NULL THEN RETURN NEW; END IF;
 v_status:=CASE WHEN NEW.status IN('accepted','delivered','read') THEN 'sent' ELSE NEW.status END;
 UPDATE broadcast_queue SET status=v_status,attempts=NEW.attempts,error_message=NEW.error_code,
 whatsapp_message_id=NEW.remote_message_id,processed_at=NEW.completed_at,updated_at=now() WHERE outbox_id=NEW.id;
 UPDATE broadcast_messages m SET status=CASE WHEN NEW.status='accepted' THEN 'sent' ELSE NEW.status END,
 whatsapp_message_id=NEW.remote_message_id,error_message=NEW.error_code,
 sent_at=CASE WHEN NEW.status IN('accepted','delivered','read') THEN coalesce(m.sent_at,now()) ELSE m.sent_at END
 FROM broadcast_queue q WHERE m.queue_id=q.id AND q.outbox_id=NEW.id AND NEW.status<>'processing';
 UPDATE broadcasts b SET sent_count=x.sent,failed_count=x.failed,
 progress_percent=CASE WHEN x.total=0 THEN 0 ELSE round(100.0*x.finished/x.total)::integer END,
 last_activity_at=now(),
 status=CASE WHEN b.status='stopped' THEN 'stopped' WHEN x.open>0 THEN 'processing' WHEN x.uncertain>0 THEN 'uncertain' WHEN x.sent=0 THEN 'failed' ELSE 'completed' END,
 completed_at=CASE WHEN x.open=0 THEN now() ELSE NULL END
 FROM(SELECT count(*) total,count(*) FILTER(WHERE status='sent') sent,count(*) FILTER(WHERE status='failed') failed,
 count(*) FILTER(WHERE status IN('sent','failed','cancelled','uncertain')) finished,
 count(*) FILTER(WHERE status IN('pending','processing')) open,count(*) FILTER(WHERE status='uncertain') uncertain
 FROM broadcast_queue WHERE broadcast_id=v_campaign) x WHERE b.id=v_campaign;
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_sync_campaign_item AFTER UPDATE OF status ON public.whatsapp_outbox
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_sync_campaign_item();

-- Legacy pending não é copiado automaticamente: migração deve reconciliar filas existentes antes de trocar worker.
-- Evita replay de mensagens que já podem ter sido enviadas pelo executor antigo.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('whatsapp_create_campaign','whatsapp_cancel_campaign','whatsapp_sync_campaign_item') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
