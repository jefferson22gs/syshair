-- =====================================================
-- DIAGNOSTICAR FALHAS NO DISPARO
-- Data: 2026-03-04 20:21
-- =====================================================

-- 1. Ver mensagens de erro específicas
SELECT
    error_message,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
AND status = 'failed'
GROUP BY error_message
ORDER BY quantidade DESC;

-- 2. Ver últimas falhas detalhadas
SELECT
    recipient_phone,
    error_message,
    created_at
FROM broadcast_messages
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar configuração da instância WhatsApp
SELECT
    wi.instance_name,
    wi.status,
    s.name as salon_name
FROM whatsapp_instances wi
JOIN salons s ON s.id = wi.salon_id
WHERE s.name ILIKE '%daniel%cabelo%';

-- 4. Ver se há itens travados na fila
SELECT
    status,
    attempts,
    COUNT(*) as quantidade
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
GROUP BY status, attempts
ORDER BY status, attempts;
