-- =====================================================
-- CRIAR DISPARO DE TESTE - 10 CONTATOS
-- Data: 2026-03-05
-- =====================================================

-- 1. Criar broadcast de teste com apenas 10 contatos
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
        'Teste de disparo - Sistema SysHair funcionando! 🚀',
        10,
        'processing',
        0,
        0,
        0
    RETURNING id, salon_id, message
),
-- 2. Popular fila com 10 primeiros contatos
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
    CROSS JOIN (
        SELECT phone
        FROM clients
        WHERE salon_id = '1777c2a7-7cee-4406-943f-1aed263bb73c'
        AND phone IS NOT NULL
        AND phone != ''
        LIMIT 10
    ) c
    RETURNING broadcast_id
)
SELECT
    nb.id as broadcast_id,
    '✅ Disparo de teste criado com 10 contatos. Aguarde 2 minutos.' as status
FROM new_broadcast nb;
