-- =====================================================
-- POPULAR FILA MANUALMENTE PARA O BROADCAST EXISTENTE
-- Data: 2026-03-04 20:35
-- =====================================================

-- Vamos popular a fila manualmente para o broadcast que já existe
-- Isso vai permitir que o worker processe as mensagens

-- 1. Buscar contatos do salão Daniel Cabelos
WITH contacts AS (
    SELECT DISTINCT phone
    FROM clients
    WHERE salon_id = '1777c2a7-7cee-4406-943f-1aed263bb73c'
    AND phone IS NOT NULL
    AND phone != ''
    LIMIT 500
)
-- 2. Inserir na fila
INSERT INTO broadcast_queue (
    broadcast_id,
    salon_id,
    recipient_phone,
    message,
    status
)
SELECT
    'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e'::uuid,
    '1777c2a7-7cee-4406-943f-1aed263bb73c'::uuid,
    phone,
    'Ola,
Tudo bem ?
Passando pra te dizer que nossa agenda melhorou pra melhor. Segue link
https://syshair.vercel.app/s/danielcabelos',
    'pending'
FROM contacts;

-- 3. Verificar quantos foram inseridos
SELECT COUNT(*) as total_inserido
FROM broadcast_queue
WHERE broadcast_id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';

-- 4. Ver status do broadcast
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count
FROM broadcasts
WHERE id = 'bce0cb48-6e74-430c-bcb0-6e2e30e3c87e';
