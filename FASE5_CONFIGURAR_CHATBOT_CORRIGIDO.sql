-- =====================================================
-- FASE 5: CONFIGURAR CHATBOT COM GROQ (CORRIGIDO)
-- Data: 2026-03-05
-- =====================================================

-- 1. Verificar se já existe chave do Groq
SELECT * FROM ai_provider_keys WHERE provider = 'groq';

-- 2. Se existir, atualizar. Se não, inserir.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM ai_provider_keys WHERE provider = 'groq') THEN
        UPDATE ai_provider_keys
        SET
            api_key = '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',
            is_active = true,
            updated_at = NOW()
        WHERE provider = 'groq';
    ELSE
        INSERT INTO ai_provider_keys (provider, api_key, is_active, created_at)
        VALUES ('groq', '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', true, NOW());
    END IF;
END $$;

-- 3. Atualizar configurações do chatbot para usar Groq
UPDATE chatbot_settings
SET
    ai_provider = 'groq',
    ai_model = 'llama-3.1-70b-versatile',
    enabled = true,
    temperature = 0.7,
    max_tokens = 500
WHERE ai_provider IS NULL OR ai_provider = '' OR ai_provider != 'groq';

-- 4. Garantir que o chatbot está habilitado
UPDATE chatbot_settings
SET enabled = true
WHERE enabled = false;

-- 5. Verificar configuração
SELECT
    s.name as salon_name,
    cs.enabled,
    cs.ai_provider,
    cs.ai_model,
    cs.bot_name,
    cs.temperature,
    cs.max_tokens,
    CASE
        WHEN cs.api_key IS NOT NULL AND cs.api_key != '' THEN '✅ API Key do Salão'
        WHEN EXISTS (SELECT 1 FROM ai_provider_keys WHERE provider = cs.ai_provider AND is_active = true) THEN '✅ API Key Global'
        ELSE '❌ SEM API KEY'
    END as api_key_status
FROM chatbot_settings cs
JOIN salons s ON s.id = cs.salon_id;

-- 6. Verificar chave do Groq
SELECT
    provider,
    LEFT(api_key, 20) || '...' as api_key_preview,
    is_active,
    created_at
FROM ai_provider_keys
WHERE provider = 'groq';

SELECT '✅ Chatbot configurado com Groq! Teste enviando mensagem WhatsApp para o salão.' as message;
