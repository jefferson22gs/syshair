-- =====================================================
-- CRIAR CRON JOB DO ZERO
-- Data: 2026-03-04 22:21
-- =====================================================

-- 1. Verificar se pg_cron está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Criar o cron job (sem tentar deletar antes)
SELECT cron.schedule(
    'process_broadcast_queue_every_minute',
    '* * * * *', -- A cada minuto
    $$
    SELECT net.http_post(
        url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

SELECT '✅ Cron job criado! Aguarde 1 minuto e verifique se o disparo está processando.' as message;
