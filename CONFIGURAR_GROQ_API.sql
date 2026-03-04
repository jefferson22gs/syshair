-- =====================================================
-- CONFIGURAR API KEYS DO GROQ
-- Data: 2026-03-04
-- =====================================================

-- 1. Adicionar chave global do Groq (para todos os salões)
-- IMPORTANTE: Substitua SUA_GROQ_API_KEY pela sua chave real do Groq
INSERT INTO ai_provider_keys (provider, api_key, is_active, created_at)
VALUES ('groq', 'SUA_GROQ_API_KEY_AQUI', true, NOW())
ON CONFLICT (provider)
DO UPDATE SET
    api_key = 'SUA_GROQ_API_KEY_AQUI',
    is_active = true,
    updated_at = NOW();

-- 2. Atualizar configurações do chatbot para usar Groq
UPDATE chatbot_settings
SET 
    ai_provider = 'groq',
    ai_model = 'llama-3.1-70b-versatile',
    enabled = true,
    temperature = 0.7,
    max_tokens = 500
WHERE ai_provider IS NULL OR ai_provider = '';

-- 3. Garantir que o chatbot está habilitado
UPDATE chatbot_settings
SET enabled = true;

-- 4. Verificar configuração
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

-- 5. Verificar chaves globais
SELECT 
    provider,
    LEFT(api_key, 20) || '...' as api_key_preview,
    is_active,
    created_at
FROM ai_provider_keys
ORDER BY provider;

SELECT '✅ Groq API configurado com sucesso!' as message;
