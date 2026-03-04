-- =====================================================
-- CORREÇÃO IMEDIATA DO DISPARO - DANIEL CABELOS
-- Broadcast ID: 1616a8f1-dbe2-444c-8749-00b11c847879
-- =====================================================

-- 1. Verificar se a queue foi criada
SELECT COUNT(*) as total_queue
FROM broadcast_queue
WHERE broadcast_id = '1616a8f1-dbe2-444c-8749-00b11c847879';

-- 2. Se retornou 0, o problema é que a queue não foi criada
-- Isso acontece quando usa a função antiga ao invés da nova (broadcast-messages-v2)

-- 3. Verificar qual função foi usada
SELECT 
    id,
    message,
    total_recipients,
    created_at
FROM broadcasts
WHERE id = '1616a8f1-dbe2-444c-8749-00b11c847879';

-- 4. SOLUÇÃO: Marcar como failed e criar novo disparo usando a função correta
UPDATE broadcasts
SET 
    status = 'failed',
    error_message = 'Queue não foi criada - usar broadcast-messages-v2',
    completed_at = NOW()
WHERE id = '1616a8f1-dbe2-444c-8749-00b11c847879';

-- 5. Verificar se o cron job está ativo
SELECT jobid, schedule, active, command
FROM cron.job
WHERE command LIKE '%broadcast-queue-worker%';

-- 6. Se não estiver ativo, ativar
UPDATE cron.job
SET active = true
WHERE command LIKE '%broadcast-queue-worker%';

SELECT '✅ Correção aplicada! Agora crie um NOVO disparo no frontend.' as message;
