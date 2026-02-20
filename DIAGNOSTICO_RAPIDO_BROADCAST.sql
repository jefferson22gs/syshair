-- ============================================
-- DIAGNÓSTICO RÁPIDO - BROADCAST TRAVADO
-- Execute estas queries e me envie os resultados
-- Data: 2026-02-20 16:00
-- ============================================

-- QUERY 1: Ver último broadcast
SELECT
    '=== ÚLTIMO BROADCAST ===' as info,
    id,
    status,
    SUBSTRING(message, 1, 50) as mensagem_preview,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at,
    completed_at,
    NOW() - created_at as tempo_rodando
FROM broadcasts
ORDER BY created_at DESC
LIMIT 1;

-- QUERY 2: Ver mensagens do último broadcast
SELECT
    '=== MENSAGENS DO ÚLTIMO BROADCAST ===' as info,
    phone,
    status,
    error_message,
    created_at,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- QUERY 3: Contar status das mensagens
SELECT
    '=== ESTATÍSTICAS ===' as info,
    status,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentual
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
GROUP BY status;

-- QUERY 4: Ver instância WhatsApp atual
SELECT
    '=== INSTÂNCIA WHATSAPP ===' as info,
    instance_name,
    status,
    phone_number,
    api_url,
    updated_at
FROM whatsapp_instances
ORDER BY updated_at DESC
LIMIT 1;

-- QUERY 5: Ver erros mais comuns
SELECT
    '=== ERROS MAIS COMUNS ===' as info,
    error_message,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
  AND status = 'failed'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY quantidade DESC;

-- QUERY 6: Ver se há broadcasts travados
SELECT
    '=== BROADCASTS TRAVADOS ===' as info,
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    created_at,
    NOW() - created_at as tempo_rodando,
    CASE
        WHEN NOW() - created_at > INTERVAL '30 minutes' THEN '🚨 TRAVADO HÁ MUITO TEMPO'
        WHEN NOW() - created_at > INTERVAL '10 minutes' THEN '⚠️ POSSIVELMENTE TRAVADO'
        ELSE '✓ OK'
    END as alerta
FROM broadcasts
WHERE status = 'processing'
ORDER BY created_at DESC;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================

-- Se QUERY 1 mostrar:
-- status = 'processing' e tempo_rodando > 10 minutos → TRAVADO
-- status = 'failed' → Ver error_message
-- status = 'completed' mas sent_count = 0 → Problema de envio

-- Se QUERY 2 mostrar:
-- Muitos status = 'failed' → Ver error_message
-- Muitos status = 'pending' → Broadcast não está processando

-- Se QUERY 4 mostrar:
-- status != 'connected' → Instância desconectada
-- instance_name diferente de 'syshair_daniel_cabelos_1777c2a7' → Usar instância errada

-- ============================================
-- CORREÇÃO RÁPIDA (se necessário):
-- ============================================

-- Se broadcast estiver travado:
UPDATE broadcasts
SET status = 'stopped', completed_at = NOW()
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Se instância estiver desconectada:
UPDATE whatsapp_instances
SET
    instance_name = 'syshair_daniel_cabelos_1777c2a7',
    status = 'connected',
    phone_number = '5519982143580'
WHERE salon_id = (SELECT id FROM salons LIMIT 1);

-- Verificar resultado:
SELECT 'Correção aplicada ✓' as status;
