BEGIN;

-- RLS permissiva preexistente: restringir ao worker; cliente só lê sua fila.
DROP POLICY IF EXISTS "Service role can manage broadcast queue" ON public.broadcast_queue;
CREATE POLICY "Service role can manage broadcast queue" ON public.broadcast_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Salons can manage their own templates" ON public.broadcast_templates;
DROP POLICY IF EXISTS "Salon admins manage templates" ON public.broadcast_templates;
CREATE POLICY "Salon admins manage templates" ON public.broadcast_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = broadcast_templates.salon_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = broadcast_templates.salon_id AND s.owner_id = auth.uid()));

-- Somente backend pode chamar RPCs que controlam filas ou disparam jobs.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND p.proname IN ('process_next_broadcast_queue_item','mark_broadcast_queue_sent',
      'mark_broadcast_queue_failed','check_broadcast_completion','cleanup_old_broadcast_queue',
      'check_and_process_scheduled_posts','trigger_scheduled_posts','post_salon_status_auto',
      'send_whatsapp_notification')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

-- Segredos separados da tabela que a UI consulta. Não retornar por API.
CREATE SCHEMA IF NOT EXISTS whatsapp_private;
REVOKE ALL ON SCHEMA whatsapp_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA whatsapp_private TO service_role;
CREATE TABLE IF NOT EXISTS whatsapp_private.instance_secrets (
  instance_id uuid PRIMARY KEY REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  webhook_secret text NOT NULL CHECK (length(webhook_secret) >= 32),
  instance_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON whatsapp_private.instance_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_private.instance_secrets TO service_role;
ALTER TABLE whatsapp_private.instance_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Worker secrets only" ON whatsapp_private.instance_secrets;
CREATE POLICY "Worker secrets only" ON whatsapp_private.instance_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Migration não elimina tokens legados; copia antes de retirar da projeção pública.
INSERT INTO whatsapp_private.instance_secrets(instance_id,webhook_secret,instance_token)
SELECT id,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),instance_token FROM public.whatsapp_instances
ON CONFLICT(instance_id) DO NOTHING;
UPDATE public.whatsapp_instances SET instance_token=NULL WHERE instance_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.whatsapp_instance_secret(p_instance_id uuid)
RETURNS TABLE(webhook_secret text, instance_token text)
LANGUAGE sql SECURITY DEFINER SET search_path=whatsapp_private,public
AS $$ SELECT s.webhook_secret,s.instance_token FROM whatsapp_private.instance_secrets s WHERE s.instance_id=p_instance_id $$;
REVOKE ALL ON FUNCTION public.whatsapp_instance_secret(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_instance_secret(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_ensure_instance_secret(p_instance_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$
DECLARE v_secret text;
BEGIN
  INSERT INTO whatsapp_private.instance_secrets(instance_id,webhook_secret)
  VALUES(p_instance_id,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','')) ON CONFLICT(instance_id) DO NOTHING;
  SELECT webhook_secret INTO v_secret FROM whatsapp_private.instance_secrets WHERE instance_id=p_instance_id;
  RETURN v_secret;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_ensure_instance_secret(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_ensure_instance_secret(uuid) TO service_role;

-- Um nome precisa resolver exatamente um salão. Abortará com diagnóstico se legado tiver duplicatas.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.whatsapp_instances GROUP BY instance_name HAVING count(*)>1) THEN
   RAISE EXCEPTION 'Nomes de instância duplicados: reconciliar antes da migration';
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_name_unique ON public.whatsapp_instances(instance_name);

-- Vínculo/URL/token não podem ser adulterados diretamente no navegador.
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_instances FROM anon,authenticated;
GRANT SELECT ON public.whatsapp_instances TO authenticated;

-- Criação do salão é o fato autorizado que cria o papel admin. Nunca aceitar autoelevação solta.
CREATE OR REPLACE FUNCTION public.whatsapp_grant_salon_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN
 INSERT INTO public.user_roles(user_id,role,salon_id) VALUES(NEW.owner_id,'admin',NEW.id)
 ON CONFLICT(user_id,role,salon_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_grant_salon_owner_admin() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS whatsapp_grant_salon_owner_admin ON public.salons;
CREATE TRIGGER whatsapp_grant_salon_owner_admin AFTER INSERT ON public.salons
FOR EACH ROW WHEN (NEW.owner_id IS NOT NULL) EXECUTE FUNCTION public.whatsapp_grant_salon_owner_admin();

COMMIT;
