-- =============================================
-- TROCAR PROVEDOR DE IA - SOLUÇÃO ALTERNATIVA
-- =============================================

-- PROBLEMA: Groq está retornando erro e caindo no fallback
-- SOLUÇÃO: Trocar para Gemini (gratuito e confiável)

-- OPÇÃO 1: Usar Gemini (Recomendado - gratuito e rápido)
UPDATE chatbot_settings
SET
    ai_provider = 'gemini',
    ai_model = 'gemini-2.5-flash',
    api_key = (
        SELECT api_key
        FROM ai_provider_keys
        WHERE provider = 'gemini'
        AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
    ),
    updated_at = NOW()
WHERE enabled = true;

-- OPÇÃO 2: Usar OpenAI (Pago mas muito confiável)
-- Descomente as linhas abaixo se preferir OpenAI:
/*
UPDATE chatbot_settings
SET
    ai_provider = 'openai',
    ai_model = 'gpt-4o-mini',
    api_key = (
        SELECT api_key
        FROM ai_provider_keys
        WHERE provider = 'openai'
        AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
    ),
    updated_at = NOW()
WHERE enabled = true;
*/

-- VERIFICAR RESULTADO
SELECT
    salon_id,
    enabled,
    ai_provider,
    ai_model,
    bot_name,
    CASE
        WHEN api_key IS NOT NULL AND LENGTH(api_key) > 0 THEN 'Configurada (' || LENGTH(api_key) || ' chars)'
        ELSE 'NÃO CONFIGURADA'
    END as api_key_status,
    active_hours_start,
    active_hours_end,
    active_days
FROM chatbot_settings
WHERE enabled = true;

-- =============================================
-- INSTRUÇÕES:
-- =============================================
-- 1. Execute este script (OPÇÃO 1 - Gemini)
-- 2. Verifique o resultado
-- 3. Teste enviando mensagem no WhatsApp
-- 4. Se ainda não funcionar, execute DEBUG_CHATBOT_ERRORS.sql
