-- =====================================================
-- MONITORAR DISPARO DE TESTE
-- Broadcast ID: 73d7bd61-41c4-493d-b4a7-0bfbd96d2193
-- =====================================================

SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_decorridos
FROM broadcasts
WHERE id = '73d7bd61-41c4-493d-b4a7-0bfbd96d2193';

SELECT
    status,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = '73d7bd61-41c4-493d-b4a7-0bfbd96d2193'
GROUP BY status;
