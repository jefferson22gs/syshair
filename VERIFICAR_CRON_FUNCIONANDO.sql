-- =====================================================
-- VERIFICAR SE CRON JOB ESTÁ FUNCIONANDO
-- Data: 2026-03-05 15:55
-- =====================================================

-- 1. Ver últimas execuções do cron job
SELECT
    jobid,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'process_broadcast_queue_every_minute')
ORDER BY start_time DESC
LIMIT 5;

-- 2. Ver se o broadcast está progredindo
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_decorridos
FROM broadcasts
ORDER BY created_at DESC
LIMIT 1;

-- 3. Ver itens na fila
SELECT
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY status;

-- 4. Ver últimas mensagens enviadas
SELECT
    recipient_phone,
    status,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
