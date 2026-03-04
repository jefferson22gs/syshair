# 🔧 VERIFICAÇÃO URGENTE - APÓS DEPLOY

**Deploy realizado:** 19/02/2026 00:59 UTC (21:59 BRT)
**Aguardar:** ~2 minutos para Vercel completar o deploy

---

## ✅ CHECKLIST DE TESTES

### 1️⃣ PRIMEIRO: Executar SQL no Supabase (SE AINDA NÃO FEZ)

**Acesse:** https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

Execute os blocos 2 a 7 do arquivo `EXECUTAR_SQL_SIMPLES.sql`

**Status:** Veja `STATUS_EXECUCAO.md`

---

### 2️⃣ Testar "Melhorar com IA"

**URL:** https://syshair.vercel.app/admin/broadcast

**Passos:**
1. Clique em "Novo Template" ou vá em "Mensagem"
2. Digite qualquer texto (ex: "Olá cliente")
3. Clique em "Melhorar com IA"

**Resultado esperado:**
- ❌ Se ainda der erro 401: A chave de IA não está configurada
- ✅ Se funcionar: Texto será melhorado

**Se der erro 401:**
```sql
-- Execute no Supabase SQL Editor
-- Obtenha chave gratuita em: https://makersuite.google.com/app/apikey
INSERT INTO public.ai_provider_keys (provider, api_key, is_active)
VALUES ('gemini', 'SUA_CHAVE_AQUI', true);
```

---

### 3️⃣ Testar Salvar Template

**URL:** https://syshair.vercel.app/admin/broadcast

**Passos:**
1. Clique no ícone de arquivo ao lado do dropdown de templates
2. Digite um nome (ex: "Teste")
3. Digite uma mensagem
4. Clique em "Salvar Template"

**Resultado esperado:**
- ✅ "Template salvo com sucesso!"
- ✅ Template aparece no dropdown

**Se der erro:**
- Verifique se executou o SQL (BLOCO 1 - renomear coluna `message` para `content`)

---

### 4️⃣ Testar Disparo de Mensagens

**URL:** https://syshair.vercel.app/admin/broadcast

**Passos:**
1. Clique em "Carregar Contatos" (ou "Adicionar" para adicionar manualmente)
2. Selecione 1-2 contatos (para teste)
3. Digite uma mensagem
4. Clique em "Enviar para X contatos"

**Resultado esperado:**
- ✅ "Disparo iniciado para X contatos"
- ✅ Após 5-10 segundos, veja o histórico atualizar
- ✅ Status deve mudar de "Enviando" para "Concluído"

**Se ficar travado:**
1. Abra o console do navegador (F12)
2. Vá em "Network" → procure por `broadcast-messages`
3. Veja se retornou 200 OK
4. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/logs
5. Procure por logs da função `broadcast-messages`
6. Me envie os logs que aparecerem

---

## 🐛 LOGS PARA DEBUG

Se o broadcast não funcionar, veja os logs:

**Supabase Logs:**
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/logs/edge-functions

**Procure por:**
- `[BROADCAST ... STARTED]` - Início do processamento
- `[ATTEMPT 1/3]` - Tentativas de envio
- `[SUCCESS]` - Mensagem enviada
- `[FAILED]` - Mensagem falhou
- `[DEBUG]` - Informações de debug (API URL, status, response)

---

## 📊 VERIFICAR NO BANCO

```sql
-- Ver últimos broadcasts
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 5;

-- Ver mensagens do último broadcast
SELECT
    recipient_phone,
    recipient_name,
    status,
    error_message,
    sent_at
FROM broadcast_messages
WHERE broadcast_id = 'COLE_O_ID_AQUI'
ORDER BY created_at;
```

---

## ⚠️ PROBLEMAS CONHECIDOS

### WhatsApp não conectado
Se aparecer "WhatsApp Desconectado":
1. Vá em https://syshair.vercel.app/admin/whatsapp
2. Clique em "Conectar"
3. Escaneie o QR Code
4. Aguarde status "Conectado"

### Evolution API offline
Se todos os envios falharem com erro de conexão:
- A API Evolution pode estar offline
- URL: https://api.tubaraoemprestimo.com.br
- Teste manualmente: https://api.tubaraoemprestimo.com.br/instance/fetchInstances

---

## 📞 ME AVISE

Após testar, me informe:
1. ✅ ou ❌ "Melhorar com IA" funcionou?
2. ✅ ou ❌ Salvar template funcionou?
3. ✅ ou ❌ Disparo de mensagens funcionou?
4. Se algo falhou, envie os logs/erros
