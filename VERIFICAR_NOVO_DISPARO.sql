-- =====================================================
-- VERIFICAR NOVO DISPARO - Daniel Cabelos
-- Data: 2026-03-04 20:09
-- =====================================================

-- 1. Ver o disparo mais recente do salão Daniel Cabelos
SELECT
    b.id,
    s.name as salon_name,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    b.progress_percent,
    b.created_at,
    b.completed_at,
    b.error_message
FROM broadcasts b
JOIN salons s ON s.id = b.salon_id
WHERE s.name ILIKE '%daniel%cabelo%'
ORDER BY b.created_at DESC
LIMIT 3;

-- 2. Verificar se a FILA foi criada (IMPORTANTE!)
SELECT
    id,
    broadcast_id,
    recipient_phone,
    status,
    attempts,
    created_at,
    processed_at
FROM broadcast_queue
WHERE broadcast_id IN (
    SELECT b.id
    FROM broadcasts b
    JOIN salons s ON s.id = b.salon_id
    WHERE s.name ILIKE '%daniel%cabelo%'
    ORDER BY b.created_at DESC
    LIMIT 1
)
ORDER BY created_at DESC
LIMIT 10;

-- 3. Ver últimas mensagens enviadas
SELECT
    created_at,
    recipient_phone,
    status,
    sent_at
FROM broadcast_messages
WHERE broadcast_id IN (
    SELECT b.id
    FROM broadcasts b
    JOIN salons s ON s.id = b.salon_id
    WHERE s.name ILIKE '%daniel%cabelo%'
    ORDER BY b.created_at DESC
    LIMIT 1
)
ORDER BY created_at DESC
LIMIT 10;
