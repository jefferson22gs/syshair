-- ============================================
-- DIAGNÓSTICO RÁPIDO - BROADCAST TRAVADO (CORRIGIDO v2)
-- Execute estas queries e me envie os resultados
-- Data: 2026-02-20 16:03
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
    whatsapp_message_id,
    created_at
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

-- QUERY 7: Ver estrutura da tabela broadcast_messages
SELECT
    '=== COLUNAS DA TABELA ===' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'broadcast_messages'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- CORREÇÃO RÁPIDA (se necessário):
-- ============================================

-- 1. Parar broadcasts travados
UPDATE broadcasts
SET
    status = 'stopped',
    completed_at = NOW(),
    error_message = 'Parado manualmente - broadcast travado'
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- 2. Atualizar instância para uma conectada
UPDATE whatsapp_instances
SET
    instance_name = 'syshair_daniel_cabelos_1777c2a7',
    status = 'connected',
    phone_number = '5519982143580',
    updated_at = NOW()
WHERE salon_id = (SELECT id FROM salons LIMIT 1);

-- 3. Limpar mensagens pendentes antigas
UPDATE broadcast_messages
SET
    status = 'failed',
    error_message = 'Timeout - broadcast travado'
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- 4. Verificar resultado
SELECT
    'Correção aplicada ✓' as status,
    (SELECT COUNT(*) FROM broadcasts WHERE status = 'stopped' AND completed_at >= NOW() - INTERVAL '1 minute') as broadcasts_parados,
    (SELECT COUNT(*) FROM broadcast_messages WHERE status = 'failed' AND error_message = 'Timeout - broadcast travado') as mensagens_limpas,
    (SELECT instance_name FROM whatsapp_instances LIMIT 1) as instancia_atual,
    (SELECT status FROM whatsapp_instances LIMIT 1) as instancia_status;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================

-- QUERY 1 (Último Broadcast):
-- - status = 'processing' e tempo_rodando > 10 min → TRAVADO, executar correção 1
-- - status = 'failed' → Ver error_message para identificar causa
-- - status = 'completed' mas sent_count = 0 → Problema de envio, ver QUERY 5

-- QUERY 2 (Mensagens):
-- - Muitos status = 'failed' → Ver error_message na QUERY 5
-- - Muitos status = 'pending' → Broadcast não está processando, executar correção 1
-- - Nenhuma mensagem → Broadcast não iniciou, problema no frontend

-- QUERY 3 (Estatísticas):
-- - 100% pending → Broadcast não processou nenhuma mensagem
-- - 100% failed → Problema grave (instância, API key, etc)
-- - Mix de sent/failed → Normal, ver taxa de sucesso

-- QUERY 4 (Instância):
-- - status != 'connected' → Executar correção 2
-- - instance_name != 'syshair_daniel_cabelos_1777c2a7' → Executar correção 2

-- QUERY 5 (Erros):
-- - "Formato de número inválido" → Números sem DDD
-- - "Instance not found" → Nome da instância incorreto
-- - "Unauthorized" → API key incorreta
-- - "Timeout" → Evolution API lenta ou offline

-- QUERY 6 (Broadcasts Travados):
-- - Se aparecer algum → Executar correção 1
