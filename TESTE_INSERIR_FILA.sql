-- =====================================================
-- TESTE: INSERIR ITEM NA FILA MANUALMENTE
-- Data: 2026-03-04 20:35
-- =====================================================

-- 1. Tentar inserir 1 item de teste na fila
INSERT INTO broadcast_queue (
    broadcast_id,
    salon_id,
    recipient_phone,
    message,
    status
) VALUES (
    'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e',
    '1777c2a7-7cee-4406-943f-1aed263bb73c',
    '5511999999999',
    'Teste de mensagem',
    'pending'
);

-- 2. Verificar se foi inserido
SELECT COUNT(*) as total_na_fila
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- 3. Ver o item inserido
SELECT
    id,
    recipient_phone,
    message,
    status,
    created_at
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'
ORDER BY created_at DESC
LIMIT 1;
