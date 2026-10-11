-- Segredo gerado pela migration de segurança só passa a valer quando enviado à Evolution.
ALTER TABLE whatsapp_private.instance_secrets ADD COLUMN IF NOT EXISTS webhook_synced_at timestamptz;

CREATE OR REPLACE FUNCTION public.whatsapp_webhook_synced(p_instance_id uuid, p_mark boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$ DECLARE v timestamptz; BEGIN
  IF p_mark THEN UPDATE whatsapp_private.instance_secrets SET webhook_synced_at=now() WHERE instance_id=p_instance_id; END IF;
  SELECT webhook_synced_at INTO v FROM whatsapp_private.instance_secrets WHERE instance_id=p_instance_id;
  RETURN v IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_webhook_synced(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_webhook_synced(uuid,boolean) TO service_role;

-- Workers server-side. invoke_edge_function lê URL/chave do Vault.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('whatsapp-inbound-worker','process-scheduled-posts');

  PERFORM cron.schedule('whatsapp-inbound-worker', '* * * * *',
    $c$SELECT public.invoke_edge_function('whatsapp-inbound-worker')$c$);

  -- Substitui chamada SQL legada: a Edge Function enfileira status no outbox.
  PERFORM cron.schedule('process-scheduled-posts', '* * * * *',
    $c$SELECT public.invoke_edge_function('process-scheduled-posts')$c$);
END $$;
