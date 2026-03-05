-- =====================================================
-- CRIAR DISPARO COMPLETO VIA SQL (SEM FRONTEND)
-- Data: 2026-03-04 22:39
-- =====================================================

-- 1. Criar o broadcast
WITH new_broadcast AS (
    INSERT INTO broadcasts (
        salon_id,
        message,
        total_recipients,
        status,
        progress_percent,
        sent_count,
        failed_count
    )
    SELECT
        '1777c2a7-7cee-4406-943f-1aed263bb73c'::uuid,
        'Olá! 👋

Temos novidades incríveis no nosso salão!

Confira nossa agenda atualizada e agende seu horário:
https://syshair.vercel.app/s/danielcabelos

Estamos te esperando! ✨',
        COUNT(*),
        'processing',
        0,
        0,
        0
    FROM clients
    WHERE salon_id = '1777c2a7-7cee-4406-943f-1aed263bb73c'
    AND phone IS NOT NULL
    AND phone != ''
    RETURNING id, salon_id, message, total_recipients
),
-- 2. Popular a fila com todos os contatos
queue_insert AS (
    INSERT INTO broadcast_queue (
        broadcast_id,
        salon_id,
        recipient_phone,
        message,
        status
    )
    SELECT
        nb.id,
        nb.salon_id,
        c.phone,
        nb.message,
        'pending'
    FROM new_broadcast nb
    CROSS JOIN clients c
    WHERE c.salon_id = nb.salon_id
    AND c.phone IS NOT NULL
    AND c.phone != ''
    RETURNING broadcast_id
)
-- 3. Retornar informações do disparo criado
SELECT
    nb.id as broadcast_id,
    nb.total_recipients,
    COUNT(qi.broadcast_id) as itens_na_fila,
    '✅ Disparo criado! O cron job vai processar automaticamente.' as status
FROM new_broadcast nb
LEFT JOIN queue_insert qi ON qi.broadcast_id = nb.id
GROUP BY nb.id, nb.total_recipients;
