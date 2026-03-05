-- =============================================
-- VERIFICAR CONFIGURAÇÕES DO CHATBOT
-- =============================================

-- 1. Ver todas as configurações do chatbot
SELECT
    id,
    salon_id,
    enabled,
    ai_provider,
    ai_model,
    bot_name,
    active_hours_start,
    active_hours_end,
    active_days,
    LENGTH(system_prompt) as system_prompt_length,
    LENGTH(custom_instructions) as custom_instructions_length,
    out_of_hours_message,
    created_at,
    updated_at
FROM chatbot_settings
ORDER BY updated_at DESC;

-- 2. Ver base de conhecimento
SELECT
    salon_id,
    category,
    question,
    answer,
    keywords,
    enabled,
    priority
FROM chatbot_knowledge_base
ORDER BY salon_id, priority DESC;

-- 3. Ver últimas conversas
SELECT
    salon_id,
    client_phone,
    direction,
    content,
    ai_response,
    ai_provider,
    ai_model,
    created_at
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 20;

-- 4. Verificar se há API keys configuradas
SELECT
    provider,
    is_active,
    LENGTH(api_key) as key_length,
    created_at
FROM ai_provider_keys
WHERE is_active = true;
