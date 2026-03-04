-- ============================================
-- VER DETALHES DA FALHA NO BROADCAST
-- Execute esta query para identificar o problema
-- ============================================

-- Ver detalhes das 2 mensagens (1 sucesso + 1 falha)
SELECT
    recipient_phone,
    recipient_name,
    status,
    error_message,
    whatsapp_message_id,
    created_at,
    sent_at,
    EXTRACT(EPOCH FROM (sent_at - created_at)) as tempo_envio_segundos
FROM broadcast_messages
WHERE broadcast_id = '64ffe3e2-9291-45f9-ad2a-aefee954a5fa'
ORDER BY created_at;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================

-- CENÁRIO 1: error_message = "Invalid phone number format"
--   → Número está em formato incorreto
--   → Solução: Verificar se tem DDI 55 + DDD + número

-- CENÁRIO 2: error_message = "Unauthorized" ou "401"
--   → API key inválida ou expirada
--   → Solução: Verificar credenciais Evolution API

-- CENÁRIO 3: error_message = "Instance not connected"
--   → Instância WhatsApp desconectou durante o envio
--   → Solução: Reconectar em /admin/whatsapp

-- CENÁRIO 4: error_message = "Rate limit exceeded"
--   → Muitas mensagens em pouco tempo
--   → Solução: Aguardar alguns minutos e tentar novamente

-- CENÁRIO 5: error_message = "Message failed to send"
--   → Erro genérico da Evolution API
--   → Solução: Verificar logs da Evolution API

-- ============================================
-- APÓS VER O RESULTADO:
-- ============================================

-- Me envie:
-- 1. O recipient_phone que FALHOU
-- 2. O error_message completo
-- 3. Se o número que falhou está no formato correto (55 + DDD + número)
