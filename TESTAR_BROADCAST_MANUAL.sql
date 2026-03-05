-- =====================================================
-- TESTAR BROADCAST MANUALMENTE
-- Data: 2026-03-05 14:40
-- =====================================================

-- 1. Invocar o worker manualmente para processar a fila
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
) as resultado;

-- 2. Aguardar 3 segundos e verificar resultado
SELECT pg_sleep(3);

-- 3. Ver status do último broadcast
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent,
    created_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 1;

-- 4. Ver itens na fila
SELECT
    status,
    COUNT(*) as quantidade,
    MAX(attempts) as max_tentativas
FROM broadcast_queue
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY status;

-- 5. Ver últimas mensagens enviadas
SELECT
    recipient_phone,
    status,
    error_message,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
