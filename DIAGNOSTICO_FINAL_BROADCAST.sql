-- ============================================
-- DIAGNÓSTICO FINAL - PROBLEMA IDENTIFICADO
-- Data: 2026-02-20 16:12
-- ============================================

-- PROBLEMA IDENTIFICADO:
-- 1. Coluna é "recipient_phone" (não "phone")
-- 2. Broadcasts com status "stopped" e sent_count = 0
-- 3. Nenhuma mensagem foi enviada

-- ============================================
-- VERIFICAR MENSAGENS DO ÚLTIMO BROADCAST
-- ============================================

-- Ver mensagens do broadcast mais recente
SELECT
    recipient_phone,
    recipient_name,
    status,
    error_message,
    whatsapp_message_id,
    created_at,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = '59b0d761-44b5-4e40-9ac2-0a5b030d306c'
ORDER BY created_at DESC
LIMIT 20;

-- Contar por status
SELECT
    status,
    COUNT(*) as quantidade,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentual
FROM broadcast_messages
WHERE broadcast_id = '59b0d761-44b5-4e40-9ac2-0a5b030d306c'
GROUP BY status;

-- Ver erros específicos
SELECT
    error_message,
    COUNT(*) as quantidade
FROM broadcast_messages
WHERE broadcast_id = '59b0d761-44b5-4e40-9ac2-0a5b030d306c'
  AND error_message IS NOT NULL
GROUP BY error_message
ORDER BY quantidade DESC;

-- ============================================
-- POSSÍVEIS CAUSAS:
-- ============================================

-- Causa 1: Broadcast foi parado antes de processar
--   - completed_at = null no primeiro broadcast
--   - Pode ter sido parado manualmente ou por timeout

-- Causa 2: Edge Function não está processando
--   - sent_count = 0 em todos os broadcasts
--   - Mensagens podem estar com status "pending"

-- Causa 3: Erro na Edge Function
--   - Verificar logs do Supabase
--   - Pode haver erro de sintaxe ou timeout

-- ============================================
-- PRÓXIMA AÇÃO:
-- ============================================

-- Execute as queries acima e me envie:
-- 1. Resultado da primeira query (mensagens)
-- 2. Resultado da segunda query (contagem por status)
-- 3. Resultado da terceira query (erros)
