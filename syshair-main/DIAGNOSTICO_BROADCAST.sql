-- ============================================
-- DIAGNÓSTICO ESPECÍFICO - BROADCAST
-- Investigar por que o disparo fica rodando mas não envia
-- Data: 2026-02-20
-- ============================================

-- 1. VERIFICAR INSTÂNCIA WHATSAPP
SELECT
    '=== INSTÂNCIA WHATSAPP ===' as secao,
    id,
    salon_id,
    instance_name,
    status,
    phone_number,
    webhook_url,
    api_url,
    api_key,
    created_at,
    updated_at
FROM whatsapp_instances
ORDER BY updated_at DESC;

-- 2. VERIFICAR ÚLTIMO BROADCAST
SELECT
    '=== ÚLTIMO BROADCAST ===' as secao,
    id,
    salon_id,
    status,
    message,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at,
    completed_at,
    (completed_at - created_at) as duracao
FROM broadcasts
ORDER BY created_at DESC
LIMIT 5;

-- 3. VERIFICAR MENSAGENS INDIVIDUAIS DO ÚLTIMO BROADCAST
SELECT
    '=== MENSAGENS DO ÚLTIMO BROADCAST ===' as secao,
    bm.id,
    bm.phone,
    bm.status,
    bm.error_message,
    bm.whatsapp_message_id,
    bm.created_at,
    bm.sent_at,
    (bm.sent_at - bm.created_at) as tempo_envio
FROM broadcast_messages bm
WHERE bm.broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY bm.created_at DESC
LIMIT 20;

-- 4. CONTAR STATUS DAS MENSAGENS
SELECT
    '=== ESTATÍSTICAS DO ÚLTIMO BROADCAST ===' as secao,
    status,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentual
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY status;

-- 5. VERIFICAR ERROS MAIS COMUNS
SELECT
    '=== ERROS MAIS COMUNS ===' as secao,
    error_message,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
  AND status = 'failed'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY quantidade DESC
LIMIT 10;

-- 6. VERIFICAR SE HÁ BROADCASTS TRAVADOS (status = processing há muito tempo)
SELECT
    '=== BROADCASTS TRAVADOS ===' as secao,
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    created_at,
    NOW() - created_at as tempo_rodando,
    CASE
        WHEN NOW() - created_at > INTERVAL '1 hour' THEN '⚠️ TRAVADO'
        WHEN NOW() - created_at > INTERVAL '30 minutes' THEN '⚠️ LENTO'
        ELSE '✓ OK'
    END as alerta
FROM broadcasts
WHERE status = 'processing'
ORDER BY created_at DESC;

-- 7. VERIFICAR CLIENTES COM TELEFONE VÁLIDO
SELECT
    '=== CLIENTES DISPONÍVEIS ===' as secao,
    COUNT(*) as total_clientes,
    COUNT(phone) FILTER (WHERE phone IS NOT NULL AND phone != '') as com_telefone,
    COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as sem_telefone
FROM clients;

-- 8. VERIFICAR FORMATO DOS TELEFONES
SELECT
    '=== FORMATO DOS TELEFONES ===' as secao,
    LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) as tamanho,
    COUNT(*) as quantidade,
    ARRAY_AGG(phone) FILTER (WHERE phone IS NOT NULL) as exemplos
FROM clients
WHERE phone IS NOT NULL AND phone != ''
GROUP BY LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'))
ORDER BY quantidade DESC;

-- 9. VERIFICAR SE EVOLUTION API ESTÁ CONFIGURADA
SELECT
    '=== CONFIGURAÇÃO EVOLUTION API ===' as secao,
    'EVOLUTION_API_URL' as variavel,
    CASE
        WHEN EXISTS (SELECT 1 FROM whatsapp_instances WHERE api_url IS NOT NULL) THEN 'Configurado ✓'
        ELSE 'Não configurado ✗'
    END as status;

-- 10. VERIFICAR BROADCASTS NAS ÚLTIMAS 24H
SELECT
    '=== BROADCASTS 24H ===' as secao,
    DATE_TRUNC('hour', created_at) as hora,
    COUNT(*) as total_broadcasts,
    SUM(total_recipients) as total_destinatarios,
    SUM(sent_count) as total_enviados,
    SUM(failed_count) as total_falhas,
    ROUND(100.0 * SUM(sent_count) / NULLIF(SUM(total_recipients), 0), 2) as taxa_sucesso
FROM broadcasts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;
