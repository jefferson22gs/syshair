-- =====================================================
-- DIAGNOSTICAR BROADCAST NÃO FUNCIONANDO
-- Data: 2026-03-05 14:40
-- =====================================================

-- 1. Ver último disparo criado
SELECT
    id,
    salon_id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_decorridos
FROM broadcasts
ORDER BY created_at DESC
LIMIT 3;

-- 2. Ver se a fila foi criada
SELECT
    broadcast_id,
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id IN (
    SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1
)
GROUP BY broadcast_id, status;

-- 3. Ver se o cron job está ativo
SELECT
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname LIKE '%broadcast%';

-- 4. Ver últimas execuções do cron (se disponível)
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%broadcast%')
ORDER BY start_time DESC
LIMIT 10;
