BEGIN;
ALTER TABLE public.whatsapp_status_posts ADD COLUMN IF NOT EXISTS outbox_id uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.whatsapp_bridge_legacy_status()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE p record; v_instance uuid;v_outbox uuid;n integer:=0;BEGIN
 FOR p IN SELECT * FROM whatsapp_status_posts WHERE NOT success AND error_message IS NULL AND outbox_id IS NULL ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED LOOP
  IF p.status_image_url IS NOT NULL AND p.status_image_url<>'' THEN UPDATE whatsapp_status_posts SET error_message='Reenvie a mídia pelo agendador seguro antes de publicar.' WHERE id=p.id;CONTINUE;END IF;
  SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=p.salon_id;
  IF v_instance IS NULL THEN CONTINUE;END IF;
  INSERT INTO whatsapp_outbox(salon_id,instance_id,idempotency_key,category,content_type,text_content)
  VALUES(p.salon_id,v_instance,'legacy-status:'||p.id::text,'status','status_text',p.status_text)
  ON CONFLICT(salon_id,idempotency_key)DO UPDATE SET id=whatsapp_outbox.id RETURNING id INTO v_outbox;
  UPDATE whatsapp_status_posts SET outbox_id=v_outbox WHERE id=p.id;n:=n+1;
 END LOOP;RETURN n;
END $$;
CREATE FUNCTION public.whatsapp_sync_legacy_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 UPDATE whatsapp_status_posts SET success=NEW.status IN('accepted','delivered','read'),posted_at=CASE WHEN NEW.status IN('accepted','delivered','read') THEN now() ELSE posted_at END,error_message=NEW.error_code
 WHERE outbox_id=NEW.id AND NEW.status IN('accepted','delivered','read','failed','uncertain','cancelled');
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_sync_legacy_status AFTER UPDATE OF status ON whatsapp_outbox FOR EACH ROW EXECUTE FUNCTION whatsapp_sync_legacy_status();
REVOKE ALL ON FUNCTION public.whatsapp_bridge_legacy_status(),public.whatsapp_sync_legacy_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_bridge_legacy_status() TO service_role;
COMMIT;
