-- =============================================
-- DEBUG - VERIFICAR ERROS DO CHATBOT
-- =============================================

-- 1. Ver últimas conversas com erros
SELECT
    id,
    salon_id,
    client_phone,
    direction,
    content,
    ai_response,
    ai_provider,
    ai_model,
    error_message,
    response_time_ms,
    tokens_used,
    created_at
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver apenas mensagens com erro
SELECT
    client_phone,
    content,
    error_message,
    ai_provider,
    ai_model,
    created_at
FROM chatbot_conversations
WHERE error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar configuração atual do chatbot
SELECT
    salon_id,
    enabled,
    ai_provider,
    ai_model,
    bot_name,
    temperature,
    max_tokens,
    response_delay_ms,
    active_hours_start,
    active_hours_end,
    active_days,
    LENGTH(api_key) as api_key_length,
    LENGTH(system_prompt) as system_prompt_length,
    LENGTH(custom_instructions) as custom_instructions_length,
    fallback_message
FROM chatbot_settings
WHERE enabled = true;

-- 4. Testar se a API key do Groq está correta
SELECT
    provider,
    is_active,
    LENGTH(api_key) as key_length,
    created_at,
    updated_at
FROM ai_provider_keys
WHERE provider ILIKE '%groq%'
AND is_active = true
ORDER BY updated_at DESC;
