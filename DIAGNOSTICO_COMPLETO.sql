-- ============================================
-- DIAGNÓSTICO COMPLETO - SYSHAIR
-- Data: 2026-02-20
-- ============================================

-- ============================================
-- 1. VERIFICAR STATUS DA INSTÂNCIA WHATSAPP
-- ============================================
SELECT
    '=== STATUS WHATSAPP ===' as secao,
    id,
    salon_id,
    instance_name,
    status,
    phone_number,
    webhook_url,
    api_url,
    created_at,
    updated_at
FROM whatsapp_instances
ORDER BY updated_at DESC;

-- ============================================
-- 2. VERIFICAR CONFIGURAÇÃO DO CHATBOT
-- ============================================
SELECT
    '=== CONFIGURAÇÃO CHATBOT ===' as secao,
    cs.id,
    cs.salon_id,
    cs.enabled,
    cs.ai_provider,
    cs.ai_model,
    cs.bot_name,
    cs.active_hours_start,
    cs.active_hours_end,
    cs.active_days,
    LENGTH(cs.api_key) as api_key_length,
    SUBSTRING(cs.fallback_message, 1, 50) || '...' as fallback_preview,
    s.name as salon_name,
    wi.instance_name,
    wi.status as whatsapp_status
FROM chatbot_settings cs
JOIN salons s ON s.id = cs.salon_id
LEFT JOIN whatsapp_instances wi ON wi.salon_id = cs.salon_id
WHERE cs.enabled = true;

-- ============================================
-- 3. VERIFICAR API KEYS GLOBAIS
-- ============================================
SELECT
    '=== API KEYS GLOBAIS ===' as secao,
    provider,
    is_active,
    LENGTH(api_key) as key_length,
    created_at,
    updated_at
FROM ai_provider_keys
WHERE is_active = true
ORDER BY provider;

-- ============================================
-- 4. VERIFICAR ÚLTIMAS CONVERSAS COM ERRO
-- ============================================
SELECT
    '=== CONVERSAS COM ERRO (24h) ===' as secao,
    cc.client_phone,
    cc.direction,
    SUBSTRING(cc.content, 1, 50) as content_preview,
    cc.ai_response,
    cc.error_message,
    cc.created_at
FROM chatbot_conversations cc
WHERE cc.created_at >= NOW() - INTERVAL '24 hours'
  AND (cc.error_message IS NOT NULL
       OR cc.content ILIKE '%desculpe%não entendi%')
ORDER BY cc.created_at DESC
LIMIT 20;

-- ============================================
-- 5. VERIFICAR BROADCASTS RECENTES
-- ============================================
SELECT
    '=== BROADCASTS RECENTES ===' as secao,
    b.id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    SUBSTRING(b.error_message, 1, 100) as error_preview,
    b.created_at,
    wi.status as instance_status
FROM broadcasts b
LEFT JOIN whatsapp_instances wi ON wi.salon_id = b.salon_id
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================
-- 6. VERIFICAR HORÁRIO ATUAL VS CONFIGURADO
-- ============================================
SELECT
    '=== VERIFICAÇÃO DE HORÁRIO ===' as secao,
    active_hours_start,
    active_hours_end,
    active_days,
    CURRENT_TIME as hora_atual,
    EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER as dia_atual,
    CASE
        WHEN CURRENT_TIME >= active_hours_start
         AND CURRENT_TIME <= active_hours_end
         AND EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER = ANY(active_days)
        THEN 'ATIVO ✓'
        ELSE 'FORA DO HORÁRIO ✗'
    END as status_atual
FROM chatbot_settings
WHERE enabled = true;

-- ============================================
-- 7. VERIFICAR BASE DE CONHECIMENTO
-- ============================================
SELECT
    '=== BASE DE CONHECIMENTO ===' as secao,
    salon_id,
    category,
    question,
    SUBSTRING(answer, 1, 50) || '...' as answer_preview,
    enabled,
    priority
FROM chatbot_knowledge_base
ORDER BY salon_id, priority DESC;

-- ============================================
-- 8. ESTATÍSTICAS GERAIS DO CHATBOT (7 dias)
-- ============================================
SELECT
    '=== ESTATÍSTICAS CHATBOT (7 dias) ===' as secao,
    DATE(created_at) as data,
    COUNT(*) as total_mensagens,
    COUNT(*) FILTER (WHERE ai_response = true) as mensagens_ia,
    COUNT(*) FILTER (WHERE error_message IS NOT NULL) as mensagens_erro,
    ROUND(100.0 * COUNT(*) FILTER (WHERE ai_response = true) / NULLIF(COUNT(*), 0), 2) as taxa_sucesso_ia,
    ROUND(AVG(response_time_ms) FILTER (WHERE ai_response = true), 0) as tempo_medio_ms
FROM chatbot_conversations
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- ============================================
-- 9. ESTATÍSTICAS DE BROADCASTS (30 dias)
-- ============================================
SELECT
    '=== ESTATÍSTICAS BROADCASTS (30 dias) ===' as secao,
    DATE(created_at) as data,
    COUNT(*) as total_broadcasts,
    SUM(total_recipients) as total_destinatarios,
    SUM(sent_count) as total_enviados,
    SUM(failed_count) as total_falhas,
    ROUND(100.0 * SUM(sent_count) / NULLIF(SUM(total_recipients), 0), 2) as taxa_sucesso
FROM broadcasts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- ============================================
-- 10. OBTER SALON_ID PARA PRÓXIMAS QUERIES
-- ============================================
SELECT
    '=== SALÕES CADASTRADOS ===' as secao,
    id as salon_id,
    name,
    phone,
    created_at
FROM salons
ORDER BY created_at DESC;
