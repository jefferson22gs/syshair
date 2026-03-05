-- =====================================================
-- VERIFICAR E INVOCAR WORKER MANUALMENTE
-- Data: 2026-03-05
-- =====================================================

-- 1. Verificar se o cron job existe
SELECT jobname, schedule, active, command
FROM cron.job
WHERE jobname LIKE '%broadcast%'
ORDER BY jobname;

-- 2. Invocar worker manualmente via HTTP
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
) as resultado;

-- 3. Verificar resultado imediatamente
SELECT
    id,
    status,
    sent_count,
    failed_count
FROM broadcasts
WHERE id = '73d7bd61-41c4-493d-b4a7-0bfbd96d2193';
