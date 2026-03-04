-- ============================================
-- PRÓXIMO PASSO - VER ÚLTIMO BROADCAST
-- Execute esta query e me envie o resultado
-- ============================================

-- Ver detalhes do último broadcast
SELECT
    '=== ÚLTIMO BROADCAST ===' as info,
    id,
    status,
    message,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at,
    completed_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutos_rodando
FROM broadcasts
ORDER BY created_at DESC
LIMIT 1;

-- Ver mensagens deste broadcast
SELECT
    '=== MENSAGENS ===' as info,
    phone,
    status,
    error_message,
    whatsapp_message_id,
    created_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

-- Contar por status
SELECT
    '=== CONTAGEM POR STATUS ===' as info,
    status,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY status;
