-- =============================================
-- ATUALIZAR API KEYS COM CHAVES CORRETAS
-- =============================================

-- Limpar chaves antigas duplicadas
DELETE FROM ai_provider_keys
WHERE provider IN ('openai', 'gemini', 'groq', 'perplexity', 'claude');

-- Inserir chaves corretas
INSERT INTO ai_provider_keys (provider, api_key, is_active, created_at, updated_at)
VALUES
    -- OpenAI (usando chave corporativa mais recente)
    ('openai', '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', true, NOW(), NOW()),

    -- Gemini Pro
    ('gemini', 'AIzaSyCnkj3bq6Tn7Nlxmw67AtIxNNHTlB9PPPI', true, NOW(), NOW()),

    -- Groq (chave mais recente)
    ('groq', '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', true, NOW(), NOW()),

    -- Perplexity PRO
    ('perplexity', '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', true, NOW(), NOW()),

    -- Claude (Anthropic)
    ('claude', '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', true, NOW(), NOW());

-- Atualizar chatbot_settings para usar Gemini com a chave correta
UPDATE chatbot_settings
SET
    ai_provider = 'gemini',
    ai_model = 'gemini-2.0-flash-exp',
    api_key = 'AIzaSyCnkj3bq6Tn7Nlxmw67AtIxNNHTlB9PPPI',
    updated_at = NOW()
WHERE enabled = true;

-- VERIFICAR RESULTADO
SELECT
    salon_id,
    enabled,
    ai_provider,
    ai_model,
    bot_name,
    LENGTH(api_key) as api_key_length,
    active_hours_start,
    active_hours_end,
    active_days
FROM chatbot_settings
WHERE enabled = true;

-- Verificar chaves instaladas
SELECT
    provider,
    is_active,
    LENGTH(api_key) as key_length,
    created_at
FROM ai_provider_keys
WHERE is_active = true
ORDER BY provider;
