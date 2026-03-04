# 🤖 CORREÇÃO DO CHATBOT IA

**Data:** 04/03/2026 19:23
**Problema:** Chatbot respondendo apenas "Desculpe, não entendi sua mensagem"
**Status:** ✅ Correção pronta para aplicar

---

## 🔍 DIAGNÓSTICO

### Problema Identificado
O chatbot está respondendo com a mensagem de fallback padrão porque:

1. **System Prompt inadequado** - Prompt muito genérico ou vazio
2. **Fallback Message** - Mensagem padrão não útil
3. **Temperature/Max Tokens** - Configurações podem estar inadequadas
4. **API Key** - Pode estar faltando ou inválida

---

## ✅ SOLUÇÃO

### Passo 1: Executar Migration SQL (2 min)

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

Copie e cole o conteúdo do arquivo:
`supabase/migrations/20260304_fix_chatbot_prompts.sql`

Clique em "Run"

**O que essa migration faz:**
- ✅ Atualiza system_prompt com instruções profissionais
- ✅ Melhora fallback_message para ser mais útil
- ✅ Corrige out_of_hours_message
- ✅ Ajusta temperature para 0.7 (ideal para conversação)
- ✅ Define max_tokens para 500 (respostas adequadas)
- ✅ Adiciona custom_instructions padrão

---

### Passo 2: Verificar API Key (1 min)

Execute no SQL Editor:

```sql
-- Ver configurações do chatbot
SELECT 
    salon_id,
    enabled,
    ai_provider,
    ai_model,
    CASE 
        WHEN api_key IS NULL OR api_key = '' THEN '❌ SEM API KEY'
        ELSE '✅ API KEY CONFIGURADA'
    END as api_key_status,
    bot_name,
    temperature,
    max_tokens
FROM chatbot_settings;
```

**Se aparecer "❌ SEM API KEY":**

Opção A - Configurar API Key do salão:
```sql
UPDATE chatbot_settings
SET api_key = 'SUA_API_KEY_AQUI'
WHERE salon_id = 'SEU_SALON_ID';
```

Opção B - Configurar API Key global (Super Admin):
```sql
-- Ver chaves globais
SELECT provider, is_active FROM ai_provider_keys;

-- Adicionar chave global (se não existir)
INSERT INTO ai_provider_keys (provider, api_key, is_active)
VALUES ('groq', 'SUA_API_KEY_GROQ', true);
-- ou
VALUES ('gemini', 'SUA_API_KEY_GEMINI', true);
-- ou
VALUES ('openai', 'SUA_API_KEY_OPENAI', true);
```

---

### Passo 3: Testar Chatbot (2 min)

1. Envie uma mensagem de teste via WhatsApp para o número do salão
2. Aguarde a resposta do chatbot
3. Verifique se a resposta está adequada

**Mensagens de teste sugeridas:**
- "Olá, quais serviços vocês oferecem?"
- "Quanto custa um corte de cabelo?"
- "Qual o horário de funcionamento?"
- "Gostaria de agendar um horário"

---

## 🔧 CONFIGURAÇÕES RECOMENDADAS

### Providers de IA Recomendados

**1. Groq (RECOMENDADO - Rápido e Gratuito)**
- Provider: `groq`
- Model: `llama-3.1-70b-versatile`
- API Key: Obter em https://console.groq.com
- Vantagens: Muito rápido, gratuito, boa qualidade

**2. Google Gemini (Bom e Gratuito)**
- Provider: `gemini`
- Model: `gemini-1.5-flash`
- API Key: Obter em https://aistudio.google.com/apikey
- Vantagens: Gratuito, boa qualidade

**3. OpenAI (Pago mas Excelente)**
- Provider: `openai`
- Model: `gpt-4o-mini`
- API Key: Obter em https://platform.openai.com/api-keys
- Vantagens: Melhor qualidade, mais caro

---

## 📊 VERIFICAR LOGS

### Ver conversas recentes
```sql
SELECT 
    created_at,
    client_name,
    client_phone,
    direction,
    content,
    ai_response,
    ai_provider,
    error_message
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 20;
```

### Ver erros
```sql
SELECT 
    created_at,
    client_phone,
    error_message
FROM chatbot_conversations
WHERE error_message IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 NOVO SYSTEM PROMPT

O novo prompt que será aplicado:

```
Você é um assistente virtual profissional de um salão de beleza.

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
- Nunca invente informações que não estão no contexto
```

---

## 🐛 TROUBLESHOOTING

### Problema: Ainda responde "Desculpe, não entendi"

**Causa 1: API Key inválida ou sem créditos**
```sql
-- Verificar
SELECT api_key FROM chatbot_settings WHERE salon_id = 'SEU_SALON_ID';
```
Solução: Atualizar API Key válida

**Causa 2: Provider incorreto**
```sql
-- Verificar
SELECT ai_provider, ai_model FROM chatbot_settings WHERE salon_id = 'SEU_SALON_ID';
```
Solução: Usar provider válido (groq, gemini, openai)

**Causa 3: Chatbot desabilitado**
```sql
-- Verificar
SELECT enabled FROM chatbot_settings WHERE salon_id = 'SEU_SALON_ID';
```
Solução: Habilitar chatbot
```sql
UPDATE chatbot_settings SET enabled = true WHERE salon_id = 'SEU_SALON_ID';
```

**Causa 4: Fora do horário**
```sql
-- Verificar horários
SELECT active_hours_start, active_hours_end, active_days 
FROM chatbot_settings WHERE salon_id = 'SEU_SALON_ID';
```
Solução: Ajustar horários ou testar dentro do horário ativo

---

## ✅ CHECKLIST

- [ ] Migration SQL executada
- [ ] API Key configurada (salão ou global)
- [ ] Chatbot habilitado
- [ ] Horários configurados
- [ ] Teste realizado
- [ ] Resposta adequada recebida

---

## 📞 OBTER API KEYS GRATUITAS

### Groq (Recomendado)
1. Acesse: https://console.groq.com
2. Crie conta gratuita
3. Vá em "API Keys"
4. Clique "Create API Key"
5. Copie a chave

### Google Gemini
1. Acesse: https://aistudio.google.com/apikey
2. Faça login com Google
3. Clique "Get API Key"
4. Copie a chave

---

## 🎉 RESULTADO ESPERADO

Após aplicar a correção:

✅ Chatbot responde adequadamente
✅ Usa informações do salão
✅ Ajuda com agendamentos
✅ Responde sobre serviços e preços
✅ Fornece informações de contato
✅ Comportamento profissional

---

**Última atualização:** 04/03/2026 19:23
