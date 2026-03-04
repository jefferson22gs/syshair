-- ============================================
-- CORREÇÕES DO CHATBOT IA - SYSHAIR
-- Data: 2026-02-20
-- ============================================
-- IMPORTANTE: Substituir 'SEU_SALON_ID' pelo ID real do salão
-- Obter o salon_id executando: SELECT id FROM salons LIMIT 1;
-- ============================================

-- ============================================
-- CORREÇÃO 1: EXPANDIR HORÁRIO PARA 24/7
-- ============================================
UPDATE chatbot_settings
SET
    active_hours_start = '00:00',
    active_hours_end = '23:59',
    active_days = ARRAY[0, 1, 2, 3, 4, 5, 6],  -- Todos os dias da semana
    updated_at = NOW()
WHERE enabled = true;

-- Verificar resultado
SELECT
    'Horário atualizado' as status,
    active_hours_start,
    active_hours_end,
    active_days
FROM chatbot_settings
WHERE enabled = true;

-- ============================================
-- CORREÇÃO 2: MELHORAR SYSTEM PROMPT
-- ============================================
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
- Se não souber algo, seja honesto e ofereça ajuda alternativa
- NUNCA responda apenas "Desculpe, não entendi" - sempre tente ajudar de alguma forma',

    custom_instructions = 'Informações adicionais sobre o salão:
- Atendemos de segunda a sábado
- Aceitamos cartão, dinheiro e PIX
- Temos estacionamento gratuito
- Trabalhamos com as melhores marcas de produtos profissionais

Sempre seja prestativo e tente resolver a dúvida do cliente.',

    updated_at = NOW()
WHERE enabled = true;

-- Verificar resultado
SELECT
    'System prompt atualizado' as status,
    LENGTH(system_prompt) as prompt_length,
    LENGTH(custom_instructions) as instructions_length
FROM chatbot_settings
WHERE enabled = true;

-- ============================================
-- CORREÇÃO 3: MELHORAR FALLBACK MESSAGE
-- ============================================
UPDATE chatbot_settings
SET
    fallback_message = 'Desculpe, não consegui processar sua mensagem no momento. 😔

Você pode:
📞 Ligar para nós
📅 Agendar pelo site
💬 Reformular sua pergunta

Como posso ajudar?',
    updated_at = NOW()
WHERE enabled = true;

-- Verificar resultado
SELECT
    'Fallback message atualizada' as status,
    fallback_message
FROM chatbot_settings
WHERE enabled = true;

-- ============================================
-- CORREÇÃO 4: ADICIONAR BASE DE CONHECIMENTO
-- ============================================
-- IMPORTANTE: Substituir 'SEU_SALON_ID' pelo ID real
-- Exemplo: '123e4567-e89b-12d3-a456-426614174000'

-- Primeiro, limpar base de conhecimento existente (opcional)
-- DELETE FROM chatbot_knowledge_base WHERE salon_id = 'SEU_SALON_ID';

-- Inserir perguntas frequentes
INSERT INTO chatbot_knowledge_base (salon_id, category, question, answer, keywords, enabled, priority)
VALUES
(
    'SEU_SALON_ID',
    'services',
    'Quais serviços vocês oferecem?',
    'Oferecemos corte, coloração, escova, manicure, pedicure, design de sobrancelhas, maquiagem e tratamentos capilares. Todos os serviços são realizados por profissionais qualificados.',
    ARRAY['serviços', 'oferece', 'tem', 'faz', 'quais', 'serviço'],
    true,
    10
),
(
    'SEU_SALON_ID',
    'prices',
    'Qual o preço do corte?',
    'O corte feminino custa R$ 80,00 e o masculino R$ 50,00. Temos pacotes promocionais! Quer saber mais?',
    ARRAY['preço', 'valor', 'quanto custa', 'corte', 'preços'],
    true,
    10
),
(
    'SEU_SALON_ID',
    'schedule',
    'Como faço para agendar?',
    'Você pode agendar de 3 formas:
1. Pelo nosso site
2. Por telefone: (11) 9999-9999
3. Aqui mesmo pelo WhatsApp! Me diga qual serviço deseja e o dia/horário preferido.',
    ARRAY['agendar', 'marcar', 'horário', 'agenda', 'agendamento'],
    true,
    10
),
(
    'SEU_SALON_ID',
    'location',
    'Onde vocês ficam?',
    'Estamos localizados na Rua Exemplo, 123 - Centro. Temos estacionamento gratuito. Quer o link do Google Maps?',
    ARRAY['endereço', 'localização', 'onde fica', 'como chegar', 'local'],
    true,
    10
),
(
    'SEU_SALON_ID',
    'hours',
    'Qual o horário de funcionamento?',
    'Funcionamos de segunda a sábado, das 9h às 19h. Aos domingos estamos fechados. Agende seu horário!',
    ARRAY['horário', 'funcionamento', 'abre', 'fecha', 'aberto'],
    true,
    10
),
(
    'SEU_SALON_ID',
    'payment',
    'Quais formas de pagamento vocês aceitam?',
    'Aceitamos dinheiro, cartão de crédito, cartão de débito e PIX. Parcelamos em até 3x sem juros no cartão!',
    ARRAY['pagamento', 'pagar', 'cartão', 'pix', 'dinheiro', 'forma'],
    true,
    10
);

-- Verificar resultado
SELECT
    'Base de conhecimento adicionada' as status,
    COUNT(*) as total_perguntas,
    COUNT(*) FILTER (WHERE enabled = true) as perguntas_ativas
FROM chatbot_knowledge_base
WHERE salon_id = 'SEU_SALON_ID';

-- ============================================
-- CORREÇÃO 5: CONFIGURAR API KEY GROQ (OPCIONAL)
-- ============================================
-- Se você tiver uma API key do Groq (gratuito), insira aqui:
-- Obter em: https://console.groq.com

-- Inserir ou atualizar API key global
INSERT INTO ai_provider_keys (provider, api_key, is_active)
VALUES ('groq', 'SUA_API_KEY_GROQ_AQUI', true)
ON CONFLICT (provider) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true, updated_at = NOW();

-- Configurar chatbot para usar Groq
UPDATE chatbot_settings
SET
    ai_provider = 'groq',
    ai_model = 'llama3-70b-8192',
    updated_at = NOW()
WHERE enabled = true;

-- Verificar resultado
SELECT
    'API Key configurada' as status,
    ai_provider,
    ai_model,
    LENGTH(api_key) as api_key_length
FROM chatbot_settings
WHERE enabled = true;

-- ============================================
-- CORREÇÃO 6: VERIFICAR WEBHOOK WHATSAPP
-- ============================================
UPDATE whatsapp_instances
SET webhook_url = 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/evolution-webhook'
WHERE webhook_url IS NULL OR webhook_url = '';

-- Verificar resultado
SELECT
    'Webhook atualizado' as status,
    instance_name,
    webhook_url,
    status
FROM whatsapp_instances;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT
    '=== VERIFICAÇÃO FINAL ===' as secao,
    cs.enabled as chatbot_ativo,
    cs.ai_provider,
    cs.ai_model,
    cs.active_hours_start || ' - ' || cs.active_hours_end as horario,
    array_length(cs.active_days, 1) as dias_ativos,
    LENGTH(cs.api_key) as tem_api_key,
    (SELECT COUNT(*) FROM chatbot_knowledge_base WHERE salon_id = cs.salon_id AND enabled = true) as perguntas_base,
    wi.status as whatsapp_status,
    wi.webhook_url IS NOT NULL as tem_webhook
FROM chatbot_settings cs
LEFT JOIN whatsapp_instances wi ON wi.salon_id = cs.salon_id
WHERE cs.enabled = true;
