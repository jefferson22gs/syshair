-- =====================================================
-- INVOCAR WORKER MANUALMENTE
-- Data: 2026-03-04 20:32
-- =====================================================

-- Chamar a função RPC que processa a queue
SELECT process_next_broadcast_queue_item();

-- Verificar resultado imediatamente
SELECT
    id,
    status,
    sent_count,
    failed_count,
    progress_percent
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- Ver itens na fila
SELECT
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
GROUP BY status;
