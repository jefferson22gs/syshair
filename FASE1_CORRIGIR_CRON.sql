-- =====================================================
-- FASE 1: CORRIGIR CRON JOB DO BROADCAST
-- Data: 2026-03-05
-- =====================================================

-- 1. Verificar se o cron job existe
SELECT
    jobid,
    jobname,
    schedule,
    active,
    LEFT(command, 100) as command_preview
FROM cron.job
WHERE jobname LIKE '%broadcast%'
ORDER BY jobname;

-- 2. Se não existir ou estiver inativo, deletar e recriar
SELECT cron.unschedule('process_broadcast_queue_every_minute');

-- 3. Criar cron job correto
SELECT cron.schedule(
    'process_broadcast_queue_every_minute',
    '* * * * *', -- A cada minuto
    $$
    SELECT net.http_post(
        url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 4. Verificar se foi criado
SELECT
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'process_broadcast_queue_every_minute';

SELECT '✅ Cron job configurado! Aguarde 1 minuto e verifique o disparo de teste.' as message;
