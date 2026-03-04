-- =====================================================
-- VERIFICAR STATUS ATUAL DO DISPARO
-- Data: 2026-03-04 20:31
-- =====================================================

-- 1. Status atualizado do disparo
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    created_at,
    completed_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_decorridos
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- 2. Contagem na fila por status
SELECT
    status,
    COUNT(*) as quantidade,
    MAX(attempts) as max_tentativas
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
GROUP BY status;

-- 3. Últimas mensagens processadas (sucesso e falha)
SELECT
    recipient_phone,
    status,
    error_message,
    sent_at,
    created_at
FROM broadcast_messages
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Resumo geral
SELECT
    CASE
        WHEN status = 'processing' AND sent_count = 0 THEN '⚠️ Processando mas sem envios - verificar worker'
        WHEN status = 'processing' AND sent_count > 0 THEN '✅ Processando normalmente'
        WHEN status = 'completed' THEN '✅ Concluído'
        WHEN status = 'failed' THEN '❌ Falhou'
        ELSE '❓ Status desconhecido'
    END as diagnostico,
    status,
    sent_count,
    failed_count,
    total_recipients,
    ROUND((sent_count::numeric / NULLIF(total_recipients, 0)) * 100, 2) as taxa_sucesso
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';
