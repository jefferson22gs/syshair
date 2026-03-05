# 📋 INSTRUÇÕES PARA O USUÁRIO - CORREÇÃO SYSHAIR

**Data:** 2026-02-20
**Status:** ✅ Arquivos de correção criados

---

## 🎯 O QUE FOI FEITO

Criei 3 arquivos essenciais para corrigir os problemas:

### 1. `DIAGNOSTICO_COMPLETO.sql`
- 10 queries de verificação
- Identifica o estado atual do sistema
- Mostra estatísticas e erros

### 2. `CORRECOES_CHATBOT.sql`
- 6 correções SQL prontas para executar
- Expande horário para 24/7
- Melhora system prompt e fallback message
- Adiciona base de conhecimento
- Configura webhook

### 3. `GUIA_CORRECAO.md`
- Passo a passo completo
- Troubleshooting
- Verificação final

---

## 🚀 PRÓXIMOS PASSOS (VOCÊ PRECISA FAZER)

### PASSO 1: Acessar o Supabase (5 min)

1. Abrir: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust
2. Fazer login
3. Ir em: **SQL Editor** (menu lateral esquerdo)

### PASSO 2: Executar Diagnóstico (5 min)

1. Abrir o arquivo `DIAGNOSTICO_COMPLETO.sql` no seu editor
2. Copiar TODO o conteúdo
3. Colar no SQL Editor do Supabase
4. Clicar em **Run** (ou Ctrl+Enter)
5. **IMPORTANTE:** Anotar o `salon_id` que aparece na última query

Exemplo do resultado:
```
salon_id: 123e4567-e89b-12d3-a456-426614174000
name: Salão Exemplo
```

### PASSO 3: Aplicar Correções (10 min)

1. Abrir o arquivo `CORRECOES_CHATBOT.sql`
2. **SUBSTITUIR** todas as ocorrências de `'SEU_SALON_ID'` pelo ID real
   - Use Find & Replace (Ctrl+H)
   - Substituir: `'SEU_SALON_ID'`
   - Por: `'123e4567-e89b-12d3-a456-426614174000'` (seu ID real)

3. Copiar TODO o conteúdo (já com o ID substituído)
4. Colar no SQL Editor do Supabase
5. Clicar em **Run**

### PASSO 4: Obter API Key Gratuita (5 min)

**IMPORTANTE:** O chatbot precisa de uma API key para funcionar.

**Opção 1: Groq (Recomendado - Gratuito e Rápido)**
1. Acessar: https://console.groq.com
2. Criar conta (gratuito)
3. Ir em: API Keys
4. Clicar em "Create API Key"
5. Copiar a chave (começa com `gsk_...`)

**Opção 2: Google Gemini (Gratuito)**
1. Acessar: https://makersuite.google.com/app/apikey
2. Criar conta Google
3. Clicar em "Create API Key"
4. Copiar a chave

**Depois de obter a chave:**
1. Voltar ao SQL Editor do Supabase
2. Executar (substituir `SUA_API_KEY_AQUI`):

```sql
-- Para Groq:
INSERT INTO ai_provider_keys (provider, api_key, is_active)
VALUES ('groq', 'gsk_SUA_CHAVE_AQUI', true)
ON CONFLICT (provider) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true;

UPDATE chatbot_settings
SET ai_provider = 'groq', ai_model = 'llama3-70b-8192'
WHERE enabled = true;
```

OU

```sql
-- Para Gemini:
INSERT INTO ai_provider_keys (provider, api_key, is_active)
VALUES ('gemini', 'SUA_CHAVE_AQUI', true)
ON CONFLICT (provider) DO UPDATE
SET api_key = EXCLUDED.api_key, is_active = true;

UPDATE chatbot_settings
SET ai_provider = 'gemini', ai_model = 'gemini-2.5-flash'
WHERE enabled = true;
```

### PASSO 5: Reconectar WhatsApp (5 min)

1. Acessar o sistema: http://localhost:5173/admin/whatsapp
   - OU a URL de produção se já estiver no ar

2. Verificar status:
   - ✅ **Verde/Conectado**: Pular para Passo 6
   - ❌ **Vermelho/Desconectado**: Continuar

3. Se desconectado:
   - Clicar em "Conectar WhatsApp"
   - Escanear QR Code com o WhatsApp do salão
   - Aguardar status mudar para "Conectado"

### PASSO 6: Testar (10 min)

**Teste 1: Chatbot**
1. Enviar mensagem no WhatsApp do salão: "Olá"
2. ✅ **Deve responder** de forma amigável
3. ❌ **Se responder "não entendi"**: Verificar se executou Passo 4 (API key)

**Teste 2: Broadcast**
1. Acessar: http://localhost:5173/admin/broadcast-messages
2. Clicar em "Carregar Contatos"
3. Selecionar seu próprio número
4. Escrever: "Teste - ignore"
5. Clicar em "Enviar"
6. ✅ **Deve receber** a mensagem no WhatsApp

---

## ✅ VERIFICAÇÃO FINAL

Execute esta query no Supabase para confirmar:

```sql
SELECT
    'Chatbot Ativo' as item,
    cs.enabled::TEXT as status
FROM chatbot_settings cs WHERE cs.enabled = true
UNION ALL
SELECT
    'API Key Configurada',
    CASE WHEN LENGTH(cs.api_key) > 0 THEN 'SIM ✓' ELSE 'NÃO ✗' END
FROM chatbot_settings cs WHERE cs.enabled = true
UNION ALL
SELECT
    'WhatsApp Status',
    wi.status
FROM whatsapp_instances wi;
```

**Resultado esperado:**
```
Chatbot Ativo         | true
API Key Configurada   | SIM ✓
WhatsApp Status       | connected
```

---

## 🆘 SE ALGO DER ERRADO

1. **Chatbot não responde:**
   - Verificar se executou Passo 4 (API key)
   - Verificar logs: Supabase Dashboard > Edge Functions > evolution-webhook > Logs

2. **Broadcast não envia:**
   - Verificar se WhatsApp está conectado (Passo 5)
   - Verificar logs: Supabase Dashboard > Edge Functions > broadcast-messages > Logs

3. **Erro "salon_id not found":**
   - Executar novamente o Passo 2 (Diagnóstico)
   - Copiar o salon_id correto

---

## 📞 DEPOIS DE TUDO FUNCIONAR

Quando tudo estiver OK, me avise para fazer o commit e push no GitHub:

```bash
git add .
git commit -m "fix: corrigir chatbot IA e disparador de transmissão"
git push origin main
```

O deploy será automático via GitHub Actions.

---

**Tempo total estimado:** 40 minutos
**Dificuldade:** Fácil (apenas copiar e colar SQLs)
**Requer:** Acesso ao Supabase e WhatsApp do salão
