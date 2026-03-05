-- =====================================================
-- MONITORAR NOVO DISPARO
-- Broadcast ID: 0b6c86f4-6aaa-48ec-af7a-155edb0124ae
-- =====================================================

-- 1. Status do disparo
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_decorridos
FROM broadcasts
WHERE id = '0b6c86f4-6aaa-48ec-af7a-155edb0124ae';

-- 2. Itens na fila por status
SELECT
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = '0b6c86f4-6aaa-48ec-af7a-155edb0124ae'
GROUP BY status;

-- 3. Taxa de sucesso
SELECT
    ROUND((sent_count::numeric / NULLIF(total_recipients, 0)) * 100, 2) as taxa_sucesso_percent,
    sent_count as enviadas,
    failed_count as falhas,
    total_recipients - sent_count - failed_count as pendentes
FROM broadcasts
WHERE id = '0b6c86f4-6aaa-48ec-af7a-155edb0124ae';
