# 🔍 COMO ACESSAR LOGS DO DISPARADOR - PASSO A PASSO

**Data:** 2026-02-20 16:00
**Objetivo:** Ver logs em tempo real do broadcast para identificar o problema

---

## 📊 ACESSAR LOGS DO SUPABASE

### PASSO 1: Abrir Dashboard do Supabase (1 min)

1. Acessar: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust
2. Fazer login (se necessário)
3. No menu lateral esquerdo, clicar em **"Edge Functions"**

### PASSO 2: Acessar Logs da Função broadcast-messages (1 min)

1. Na lista de Edge Functions, procurar por: **broadcast-messages**
2. Clicar no nome da função
3. Clicar na aba **"Logs"**

### PASSO 3: Filtrar Logs Recentes (1 min)

1. No topo da página de logs, há um filtro de tempo
2. Selecionar: **"Last 1 hour"** ou **"Last 24 hours"**
3. Os logs mais recentes aparecerão no topo

---

## 🔍 O QUE PROCURAR NOS LOGS

### ✅ Logs de Sucesso (o que você DEVE ver)

```
[BROADCAST abc123] STARTED
Recipients: 3
API: https://api.tubaraoemprestimo.com.br
Instance: syshair_daniel_cabelos_1777c2a7

[ATTEMPT 1/3] Sending to 5519999999999
[DEBUG] RemoteJid: 5519999999999@s.whatsapp.net
[DEBUG] API URL: https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7
[DEBUG] Response status: 200
[DEBUG] Response body: {"key":{"remoteJid":"5519999999999@s.whatsapp.net"...
[SUCCESS] 5519999999999 (ID: 3EB0E98571DD4C893EB824) - 1 attempt(s)

[BROADCAST abc123] FINISHED
Status: completed
Sent: 3, Failed: 0
Success rate: 100.0%
```

### ❌ Logs de Erro (o que pode estar acontecendo)

**Erro 1: Instância não encontrada**
```
[ERROR] Instance not found: syshair_jefferson_santos_31a1af0c
```
**Solução:** Executar FIX_BROADCAST_URGENTE.sql para atualizar instância

**Erro 2: Timeout na API**
```
[ATTEMPT 1/3] Sending to 5519999999999
[EXCEPTION] Timeout: Request timed out after 15000ms
```
**Solução:** Evolution API pode estar lenta ou offline

**Erro 3: Erro de autenticação**
```
[DEBUG] Response status: 401
[FAILED] 5519999999999 - Unauthorized
```
**Solução:** API Key incorreta ou expirada

**Erro 4: Número inválido**
```
[SKIPPING] Invalid phone format: 999999999
```
**Solução:** Números precisam ter DDD (11 dígitos) ou DDI+DDD (13 dígitos)

**Erro 5: Instância desconectada**
```
[DEBUG] Response status: 404
[FAILED] Instance not connected
```
**Solução:** Reconectar WhatsApp via /admin/whatsapp

---

## 🚨 CENÁRIOS COMUNS

### Cenário 1: Nenhum log aparece

**Problema:** A função não está sendo chamada

**Verificar:**
1. Abrir console do navegador (F12)
2. Ir em /admin/broadcast-messages
3. Clicar em "Enviar"
4. Ver se há erros no console

**Possível causa:**
- Erro no frontend antes de chamar a Edge Function
- Problema de permissões RLS

### Cenário 2: Logs param em "STARTED" e não continuam

**Problema:** Função travou no meio do processamento

**Verificar no SQL:**
```sql
-- Ver broadcasts travados
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    created_at,
    NOW() - created_at as tempo_rodando
FROM broadcasts
WHERE status = 'processing'
ORDER BY created_at DESC;
```

**Solução:**
```sql
-- Parar broadcasts travados
UPDATE broadcasts
SET status = 'stopped', completed_at = NOW()
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '10 minutes';
```

### Cenário 3: Muitos erros "[FAILED]"

**Problema:** Mensagens não estão sendo enviadas

**Verificar:**
1. Ler a mensagem de erro específica
2. Ver se é problema de formato de número
3. Ver se é problema de instância

**Solução comum:**
```sql
-- Atualizar instância para uma conectada
UPDATE whatsapp_instances
SET
    instance_name = 'syshair_daniel_cabelos_1777c2a7',
    status = 'connected'
WHERE salon_id = (SELECT id FROM salons LIMIT 1);
```

---

## 🔧 TESTE EM TEMPO REAL

### Como Testar e Ver Logs Simultaneamente

1. **Aba 1:** Abrir Supabase Logs (Edge Functions → broadcast-messages → Logs)
2. **Aba 2:** Abrir /admin/broadcast-messages
3. **Ação:** Enviar mensagem de teste para 1-2 contatos
4. **Observar:** Logs aparecendo em tempo real na Aba 1

**Tempo de atualização dos logs:** ~5-10 segundos

---

## 📊 QUERIES ÚTEIS PARA DIAGNÓSTICO

### Ver último broadcast e suas mensagens
```sql
-- Ver último broadcast
SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 1;

-- Ver mensagens do último broadcast
SELECT
    phone,
    status,
    error_message,
    created_at
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;
```

### Ver taxa de sucesso
```sql
SELECT
    b.id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    ROUND(100.0 * b.sent_count / NULLIF(b.total_recipients, 0), 1) as taxa_sucesso_pct
FROM broadcasts b
ORDER BY b.created_at DESC
LIMIT 5;
```

---

## 🎯 AÇÃO IMEDIATA

Se você não conseguir acessar os logs do Supabase, execute estas queries SQL:

```sql
-- 1. Ver último broadcast
SELECT
    id,
    status,
    message,
    total_recipients,
    sent_count,
    failed_count,
    error_message,
    created_at,
    completed_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 1;

-- 2. Ver mensagens com erro
SELECT
    phone,
    status,
    error_message
FROM broadcast_messages
WHERE broadcast_id = (SELECT id FROM broadcasts ORDER BY created_at DESC LIMIT 1)
  AND status = 'failed'
LIMIT 10;

-- 3. Ver instância atual
SELECT
    instance_name,
    status,
    phone_number
FROM whatsapp_instances;
```

**Com base nos resultados dessas queries, posso te ajudar a identificar o problema específico!**

---

## 📞 ME ENVIE ESTAS INFORMAÇÕES

Para eu te ajudar melhor, me envie:

1. **Resultado da query 1** (último broadcast)
2. **Resultado da query 2** (mensagens com erro)
3. **Resultado da query 3** (instância atual)
4. **Print dos logs** (se conseguir acessar)

Com essas informações, posso identificar exatamente o que está acontecendo!

---

**Desenvolvido por:** Claude Opus 4.6
**Data:** 2026-02-20 16:00
**Tempo estimado:** 5 minutos para acessar logs
