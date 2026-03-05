-- =====================================================
-- CORRIGIR CRON JOB DO BROADCAST (SEM current_setting)
-- Data: 2026-03-05 15:52
-- =====================================================

-- 1. Deletar todos os cron jobs antigos do broadcast
SELECT cron.unschedule('process_broadcast_queue_every_minute');

-- 2. Criar cron job CORRETO usando variável de ambiente do Supabase
-- O Supabase expõe a service role key via pg_net automaticamente
SELECT cron.schedule(
    'process_broadcast_queue_every_minute',
    '* * * * *', -- A cada minuto
    $$
    SELECT
        net.http_post(
            url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
            headers := '{"Content-Type": "application/json"}'::jsonb
        ) as request_id;
    $$
);

-- 3. Verificar se foi criado
SELECT
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname = 'process_broadcast_queue_every_minute';

-- 4. Testar invocação manual (sem Authorization header)
SELECT
    net.http_post(
        url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
        headers := '{"Content-Type": "application/json"}'::jsonb
    ) as request_id;

SELECT '✅ Cron job corrigido! Aguarde 1 minuto e verifique se está processando.' as message;
