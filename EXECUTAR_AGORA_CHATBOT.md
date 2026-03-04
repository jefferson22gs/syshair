# 🚀 EXECUTAR AGORA - CONFIGURAR CHATBOT

**Data:** 04/03/2026 19:25
**Tempo:** 3 minutos
**Status:** Pronto para executar

---

## 🎯 EXECUTE ESTES 2 ARQUIVOS SQL

### Passo 1: Corrigir Prompts (1 min)

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

**Arquivo 1:** `supabase/migrations/20260304_fix_chatbot_prompts.sql`

Copie TODO o conteúdo e cole no SQL Editor, clique "Run"

**O que faz:**
- ✅ Atualiza system prompt profissional
- ✅ Melhora mensagens de fallback
- ✅ Ajusta configurações (temperature, max_tokens)

---

### Passo 2: Configurar Groq API (1 min)

**Arquivo 2:** `CONFIGURAR_GROQ_API.sql`

Copie TODO o conteúdo e cole no SQL Editor, clique "Run"

**O que faz:**
- ✅ Adiciona API Key do Groq (global)
- ✅ Configura chatbot para usar Groq
- ✅ Habilita chatbot
- ✅ Verifica configuração

---

### Passo 3: Testar (1 min)

Envie mensagem de teste via WhatsApp:

**Mensagens sugeridas:**
1. "Olá, quais serviços vocês oferecem?"
2. "Quanto custa um corte de cabelo?"
3. "Qual o horário de funcionamento?"
4. "Gostaria de agendar um horário"

---

## ✅ RESULTADO ESPERADO

Após executar os 2 arquivos SQL:

✅ Chatbot responde adequadamente
✅ Usa informações do salão
✅ Ajuda com agendamentos
✅ Comportamento profissional
✅ Respostas em português

---

## 🔍 VERIFICAR SE FUNCIONOU

Execute no SQL Editor:

```sql
-- Ver últimas conversas
SELECT 
    created_at,
    client_name,
    direction,
    content,
    ai_response,
    ai_provider
FROM chatbot_conversations
ORDER BY created_at DESC
LIMIT 10;
```

**Esperado:**
- direction = 'incoming' (mensagem do cliente)
- direction = 'outgoing' (resposta do bot)
- ai_response = true (resposta gerada pela IA)
- ai_provider = 'groq'

---

## 🐛 SE NÃO FUNCIONAR

### Verificar se chatbot está habilitado
```sql
SELECT enabled, ai_provider, ai_model 
FROM chatbot_settings;
```

Se enabled = false:
```sql
UPDATE chatbot_settings SET enabled = true;
```

### Verificar horário de funcionamento
```sql
SELECT active_hours_start, active_hours_end, active_days
FROM chatbot_settings;
```

O chatbot só responde dentro do horário configurado!

Para testar fora do horário, ajuste:
```sql
UPDATE chatbot_settings
SET 
    active_hours_start = '00:00',
    active_hours_end = '23:59',
    active_days = ARRAY[0,1,2,3,4,5,6]; -- Todos os dias
```

---

## 📊 CONFIGURAÇÃO DO GROQ

**Provider:** groq
**Model:** `llama-3.1-70b-versatile`

**API Key:**
- Você receberá a API Key separadamente por segurança
- Substitua `SUA_GROQ_API_KEY_AQUI` no arquivo `CONFIGURAR_GROQ_API.sql`

---

## 🎉 PRONTO!

Após executar os 2 arquivos SQL, o chatbot estará:

✅ Configurado com Groq (rápido e gratuito)
✅ Com prompts profissionais
✅ Pronto para responder clientes
✅ 100% funcional

**Tempo total: 3 minutos**

---

**Última atualização:** 04/03/2026 19:25
