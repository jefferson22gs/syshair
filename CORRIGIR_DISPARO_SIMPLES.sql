-- =====================================================
-- CORRIGIR DISPARO TRAVADO - VERSÃO SIMPLIFICADA
-- Data: 2026-03-04
-- =====================================================

-- 1. Marcar o broadcast atual como failed
UPDATE broadcasts
SET
    status = 'failed',
    completed_at = NOW(),
    error_message = 'Timeout - Frontend estava usando função antiga. Corrigido para usar broadcast-messages-v2'
WHERE id = '1616a8f1-dbe2-444c-8749-00b11c847879'
AND status = 'processing';

-- 2. Verificar se foi atualizado
SELECT
    id,
    salon_id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    error_message,
    created_at,
    completed_at
FROM broadcasts
WHERE id = '1616a8f1-dbe2-444c-8749-00b11c847879';

-- 3. Limpar possíveis entradas na fila (se existirem)
DELETE FROM broadcast_queue
WHERE broadcast_id = '1616a8f1-dbe2-444c-8749-00b11c847879';

SELECT '✅ Broadcast marcado como failed. Agora você pode criar um novo disparo de teste!' as message;
