-- =====================================================
-- VERIFICAR E RECRIAR CRON JOB
-- Data: 2026-03-04 20:44
-- =====================================================

-- 1. Verificar se a extensão pg_cron está habilitada
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Ver todos os cron jobs (pode dar erro de permissão)
-- SELECT * FROM cron.job;

-- 3. Deletar cron job antigo se existir
SELECT cron.unschedule('process_broadcast_queue_every_minute');

-- 4. Recriar o cron job
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

-- 5. Verificar se foi criado
SELECT jobid, schedule, command, active
FROM cron.job
WHERE jobname = 'process_broadcast_queue_every_minute';
