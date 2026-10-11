BEGIN;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS local_time time;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS anchor_day integer CHECK(anchor_day BETWEEN 1 AND 31);
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS media_path text;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS media_mime text;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS outbox_id uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL;
ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;
ALTER TABLE public.scheduled_posts ADD CONSTRAINT scheduled_posts_status_check CHECK(status IN('scheduled','processing','posted','failed','cancelled','uncertain'));

CREATE TABLE public.whatsapp_status_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
 salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
 scheduled_for timestamptz NOT NULL,
 outbox_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_outbox(id),
 status text NOT NULL DEFAULT 'pending',
 remote_message_id text,
 error_code text,
 completed_at timestamptz,
 UNIQUE(post_id,scheduled_for)
);
ALTER TABLE public.whatsapp_status_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read status runs" ON public.whatsapp_status_runs FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM salons s WHERE s.id=whatsapp_status_runs.salon_id AND s.owner_id=auth.uid()));
CREATE POLICY "Workers manage status runs" ON public.whatsapp_status_runs FOR ALL TO service_role USING(true) WITH CHECK(true);
REVOKE ALL ON public.whatsapp_status_runs FROM anon,authenticated;
GRANT SELECT ON public.whatsapp_status_runs TO authenticated;
GRANT ALL ON public.whatsapp_status_runs TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_enqueue_due_status()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE p record; v_instance uuid; v_outbox uuid; n integer:=0; BEGIN
 FOR p IN SELECT * FROM scheduled_posts WHERE status='scheduled' AND scheduled_at<=now()
 ORDER BY scheduled_at LIMIT 20 FOR UPDATE SKIP LOCKED LOOP
  SELECT id INTO v_instance FROM whatsapp_instances WHERE salon_id=p.salon_id;
  IF v_instance IS NULL THEN CONTINUE; END IF;
  -- Não baixar URL arbitrária ou mídia pública legada sem revisar origem.
  IF p.content_type<>'text' AND (p.media_path IS NULL OR split_part(p.media_path,'/',1)<>p.salon_id::text) THEN
   UPDATE scheduled_posts SET status='failed',error_message='Mídia antiga: envie o arquivo novamente no armazenamento privado.' WHERE id=p.id;
   CONTINUE;
  END IF;
  INSERT INTO whatsapp_outbox(salon_id,instance_id,idempotency_key,category,content_type,text_content,media_path,media_mime,media_filename,scheduled_for)
  VALUES(p.salon_id,v_instance,'status:'||p.id::text||':'||extract(epoch FROM p.scheduled_at)::text,'status','status_'||p.content_type,coalesce(p.text_content,''),p.media_path,p.media_mime,p.media_filename,p.scheduled_at)
  ON CONFLICT(salon_id,idempotency_key) DO UPDATE SET id=whatsapp_outbox.id RETURNING id INTO v_outbox;
  INSERT INTO whatsapp_status_runs(post_id,salon_id,scheduled_for,outbox_id) VALUES(p.id,p.salon_id,p.scheduled_at,v_outbox) ON CONFLICT(post_id,scheduled_for) DO NOTHING;
  UPDATE scheduled_posts SET status='processing',outbox_id=v_outbox,local_time=coalesce(local_time,(p.scheduled_at AT TIME ZONE p.timezone)::time),anchor_day=coalesce(anchor_day,extract(day FROM p.scheduled_at AT TIME ZONE p.timezone)::integer) WHERE id=p.id;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_next_status_time(p_post public.scheduled_posts,p_now timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SET search_path=public
AS $$ DECLARE d date; candidate timestamptz; local_stamp timestamp; day_expected integer; i integer; BEGIN
 IF p_post.recurrence_type='once' THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_post.timezone) THEN RAISE EXCEPTION 'invalid_timezone'; END IF;
 d:=(p_now AT TIME ZONE p_post.timezone)::date;
 FOR i IN 0..370 LOOP
  IF p_post.recurrence_end_date IS NOT NULL AND d>p_post.recurrence_end_date THEN RETURN NULL; END IF;
  IF p_post.recurrence_type='weekly' THEN
   IF coalesce(cardinality(p_post.recurrence_days),0)>0 THEN
    IF NOT extract(dow FROM d)::integer=ANY(p_post.recurrence_days) THEN d:=d+1; CONTINUE; END IF;
   ELSIF extract(dow FROM d)<>extract(dow FROM p_post.scheduled_at AT TIME ZONE p_post.timezone) THEN d:=d+1; CONTINUE;
   END IF;
  END IF;
  IF p_post.recurrence_type='monthly' THEN
   day_expected:=least(coalesce(p_post.anchor_day,extract(day FROM p_post.scheduled_at AT TIME ZONE p_post.timezone)::integer),extract(day FROM (date_trunc('month',d)+interval '1 month - 1 day'))::integer);
   IF extract(day FROM d)::integer<>day_expected THEN d:=d+1; CONTINUE; END IF;
  END IF;
  local_stamp:=d+coalesce(p_post.local_time,(p_post.scheduled_at AT TIME ZONE p_post.timezone)::time);
  candidate:=local_stamp AT TIME ZONE p_post.timezone;
  -- Pulo/ambiguidade de DST nunca muda horário silenciosamente.
  IF (candidate AT TIME ZONE p_post.timezone)<>local_stamp OR ((candidate-interval '1 hour') AT TIME ZONE p_post.timezone)=local_stamp OR ((candidate+interval '1 hour') AT TIME ZONE p_post.timezone)=local_stamp THEN RAISE EXCEPTION 'ambiguous_or_nonexistent_local_time'; END IF;
  IF candidate>p_now AND candidate>p_post.scheduled_at THEN RETURN candidate; END IF;
  d:=d+1;
 END LOOP;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_sync_status_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE p public.scheduled_posts; v_next timestamptz; BEGIN
 SELECT * INTO p FROM scheduled_posts WHERE outbox_id=NEW.id FOR UPDATE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 UPDATE whatsapp_status_runs SET status=NEW.status,remote_message_id=NEW.remote_message_id,error_code=NEW.error_code,completed_at=NEW.completed_at WHERE outbox_id=NEW.id;
 IF p.status='cancelled' THEN RETURN NEW; END IF;
 IF NEW.status IN('accepted','delivered','read') AND OLD.status NOT IN('accepted','delivered','read') THEN
  BEGIN v_next:=whatsapp_next_status_time(p,now()); EXCEPTION WHEN OTHERS THEN
   UPDATE scheduled_posts SET status='failed',error_message='Próxima ocorrência precisa de revisão do horário/fuso.',posted_at=now(),whatsapp_status_id=NEW.remote_message_id WHERE id=p.id;
   RETURN NEW;
  END;
  UPDATE scheduled_posts SET status=CASE WHEN v_next IS NULL THEN 'posted' ELSE 'scheduled' END,
   scheduled_at=coalesce(v_next,scheduled_at),posted_at=now(),whatsapp_status_id=NEW.remote_message_id,
   error_message=NULL,outbox_id=CASE WHEN v_next IS NULL THEN outbox_id ELSE NULL END WHERE id=p.id;
 ELSIF NEW.status IN('failed','uncertain','cancelled') THEN
  UPDATE scheduled_posts SET status=NEW.status,error_message=NEW.error_code WHERE id=p.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_sync_status_run AFTER UPDATE OF status ON public.whatsapp_outbox FOR EACH ROW EXECUTE FUNCTION public.whatsapp_sync_status_run();

CREATE OR REPLACE FUNCTION public.whatsapp_cancel_status(p_post_id uuid,p_salon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE v_outbox uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM salons WHERE id=p_salon_id AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT outbox_id INTO v_outbox FROM scheduled_posts WHERE id=p_post_id AND salon_id=p_salon_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'post_missing'; END IF;
 UPDATE scheduled_posts SET status='cancelled' WHERE id=p_post_id;
 UPDATE whatsapp_outbox SET status='cancelled',error_code='post_cancelled',claim_token=NULL,lease_until=NULL,completed_at=now()
 WHERE id=v_outbox AND (status='pending' OR (status='processing' AND send_started_at IS NULL));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_cancel_status(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_cancel_status(uuid,uuid) TO authenticated;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('whatsapp_enqueue_due_status','whatsapp_next_status_time','whatsapp_sync_status_run') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
-- Browser não pode pular validação de mídia/fuso, editar job em processamento nem apagar outbox.
REVOKE INSERT,UPDATE,DELETE ON public.scheduled_posts FROM anon,authenticated;
GRANT SELECT ON public.scheduled_posts TO authenticated;
COMMIT;
