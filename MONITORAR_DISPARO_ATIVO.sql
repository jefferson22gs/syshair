-- =====================================================
-- MONITORAR DISPARO ATIVO EM TEMPO REAL
-- Data: 2026-03-04 20:20
-- =====================================================

-- 1. Status do disparo atual
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    created_at,
    completed_at
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- 2. Itens na fila (pending = aguardando, processing = enviando)
SELECT
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
GROUP BY status
ORDER BY status;

-- 3. Últimas 10 mensagens enviadas/falhadas
SELECT
    recipient_phone,
    status,
    error_message,
    sent_at,
    created_at
FROM broadcast_messages
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Taxa de sucesso
SELECT
    ROUND((sent_count::numeric / NULLIF(total_recipients, 0)) * 100, 2) as taxa_sucesso_percent,
    sent_count as enviadas,
    failed_count as falhas,
    total_recipients as total
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';
