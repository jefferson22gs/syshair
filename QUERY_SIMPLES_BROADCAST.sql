-- ============================================
-- QUERY SIMPLES - VER ÚLTIMO BROADCAST
-- Execute esta query e me envie o resultado
-- ============================================

-- 1. Ver estrutura da tabela primeiro
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'broadcast_messages'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver último broadcast (sem detalhes de mensagens)
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at,
    completed_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 3;

-- 3. Ver quantas mensagens existem no último broadcast
SELECT
    broadcast_id,
    COUNT(*) as total_mensagens
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY broadcast_id;

-- 4. Se a query acima funcionar, execute esta para ver as mensagens
-- (Substitua 'BROADCAST_ID' pelo id retornado na query 2)
-- SELECT * FROM broadcast_messages WHERE broadcast_id = 'BROADCAST_ID' LIMIT 5;
