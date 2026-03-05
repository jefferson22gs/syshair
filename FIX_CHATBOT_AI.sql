-- =============================================
-- CORRIGIR CONFIGURAÇÕES DO CHATBOT IA
-- =============================================

-- PROBLEMA: IA só responde "fora do horário" mesmo com WhatsApp conectado
-- CAUSA: Horário de funcionamento muito restritivo ou custom_instructions vazio

-- SOLUÇÃO 1: Expandir horário de funcionamento para 24/7 (temporário para teste)
UPDATE chatbot_settings
SET
    active_hours_start = '00:00',
    active_hours_end = '23:59',
    active_days = ARRAY[0, 1, 2, 3, 4, 5, 6],  -- Todos os dias da semana
    updated_at = NOW()
WHERE enabled = true;

-- SOLUÇÃO 2: Garantir que custom_instructions tenha conteúdo útil
UPDATE chatbot_settings
SET
    custom_instructions = COALESCE(
        NULLIF(TRIM(custom_instructions), ''),
        'Você é um assistente virtual de um salão de beleza.

Suas funções:
- Responder perguntas sobre serviços, preços e horários
- Ajudar clientes a agendar atendimentos
- Fornecer informações sobre localização e contato
- Ser sempre educado, prestativo e profissional

IMPORTANTE: Use as informações do salão fornecidas no contexto para responder com precisão.'
    ),
    updated_at = NOW()
WHERE enabled = true;

-- SOLUÇÃO 3: Melhorar o system_prompt
UPDATE chatbot_settings
SET
    system_prompt = 'Você é um assistente virtual profissional de um salão de beleza.

Suas responsabilidades:
- Responder dúvidas sobre serviços, preços e horários de forma clara e objetiva
- Ajudar clientes a agendar atendimentos (pergunte data, horário e serviço desejado)
- Fornecer informações sobre o salão (localização, contato, formas de pagamento)
- Ser educado, prestativo, amigável e profissional
- Usar as informações fornecidas no contexto (serviços, preços, horários do salão)

IMPORTANTE:
- Sempre responda em português brasileiro
- Seja objetivo e direto nas respostas
- Use as informações do contexto fornecido
- Se não souber algo, seja honesto e ofereça ajuda alternativa',
    updated_at = NOW()
WHERE enabled = true;

-- VERIFICAR RESULTADO
SELECT
    salon_id,
    enabled,
    bot_name,
    active_hours_start,
    active_hours_end,
    active_days,
    LENGTH(system_prompt) as system_prompt_chars,
    LENGTH(custom_instructions) as custom_instructions_chars,
    ai_provider,
    ai_model,
    CASE
        WHEN api_key IS NOT NULL AND LENGTH(api_key) > 0 THEN 'Configurada'
        ELSE 'NÃO CONFIGURADA'
    END as api_key_status
FROM chatbot_settings
WHERE enabled = true;

-- =============================================
-- INSTRUÇÕES:
-- =============================================
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique o resultado da query final
-- 3. Se api_key_status = 'NÃO CONFIGURADA', configure a API key no painel admin
-- 4. Teste enviando uma mensagem no WhatsApp
-- 5. A IA deve responder com contexto do salão, não apenas "fora do horário"
