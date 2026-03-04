-- =====================================================
-- CORREÇÃO DOS PROMPTS DO CHATBOT IA
-- Data: 2026-03-04
-- Objetivo: Melhorar system_prompt e fallback_message
-- =====================================================

-- Atualizar system_prompt padrão para ser mais eficaz
UPDATE chatbot_settings
SET system_prompt = 'Você é um assistente virtual profissional de um salão de beleza.

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
- Nunca invente informações que não estão no contexto'
WHERE system_prompt LIKE '%Desculpe%' 
   OR system_prompt = '' 
   OR system_prompt IS NULL;

-- Atualizar fallback_message para ser mais útil
UPDATE chatbot_settings
SET fallback_message = 'Desculpe, estou com dificuldades técnicas no momento. 😔

Por favor, entre em contato diretamente conosco:
📞 Telefone do salão (verifique nas informações)

Ou tente novamente em alguns instantes. Obrigado pela compreensão! 🙏'
WHERE fallback_message LIKE '%nao entendi%'
   OR fallback_message LIKE '%não entendi%'
   OR fallback_message = ''
   OR fallback_message IS NULL;

-- Atualizar out_of_hours_message
UPDATE chatbot_settings
SET out_of_hours_message = 'Olá! 👋

No momento estamos fora do horário de atendimento.

🕐 Nosso horário de funcionamento:
Segunda a Sexta: 09:00 às 18:00
Sábado: 09:00 às 14:00

Deixe sua mensagem que responderemos assim que possível! 😊'
WHERE out_of_hours_message = ''
   OR out_of_hours_message IS NULL;

-- Garantir que temperature está em um valor adequado (0.7 é bom para conversação)
UPDATE chatbot_settings
SET temperature = 0.7
WHERE temperature > 1.5 OR temperature < 0.3;

-- Garantir max_tokens adequado
UPDATE chatbot_settings
SET max_tokens = 500
WHERE max_tokens < 100 OR max_tokens > 2000;

-- Adicionar custom_instructions padrão se estiver vazio
UPDATE chatbot_settings
SET custom_instructions = 'Instruções adicionais:
- Sempre seja cordial e use emojis quando apropriado
- Se o cliente perguntar sobre agendamento, pergunte: data preferida, horário e serviço desejado
- Se o cliente perguntar sobre preços, liste os serviços disponíveis
- Se o cliente perguntar sobre localização, forneça o endereço completo
- Mantenha as respostas concisas (máximo 3-4 linhas por resposta)'
WHERE custom_instructions = '' OR custom_instructions IS NULL;

-- Log da atualização
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM chatbot_settings;
    RAISE NOTICE 'Prompts do chatbot atualizados. Total de configurações: %', updated_count;
END $$;

SELECT 'Prompts do chatbot corrigidos com sucesso!' as message;
