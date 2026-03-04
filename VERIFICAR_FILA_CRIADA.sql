-- =====================================================
-- VERIFICAR SE A FILA FOI CRIADA
-- Data: 2026-03-04 20:32
-- =====================================================

-- 1. Contar itens na fila
SELECT COUNT(*) as total_na_fila
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- 2. Ver primeiros 10 itens da fila
SELECT
    id,
    recipient_phone,
    status,
    attempts,
    max_attempts,
    created_at
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
ORDER BY created_at
LIMIT 10;

-- 3. Verificar se a função RPC existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'process_next_broadcast_queue_item'
AND routine_schema = 'public';

-- 4. Ver detalhes do broadcast
SELECT
    id,
    salon_id,
    message,
    total_recipients,
    created_at
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';
