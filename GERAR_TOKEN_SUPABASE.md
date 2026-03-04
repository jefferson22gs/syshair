# 🔑 GERAR TOKEN DO SUPABASE

**Importante:** O token que você forneceu não é o correto para o Supabase CLI.

---

## ❌ Tokens que NÃO funcionam

- ❌ `sb_publishable_...` - API Key pública
- ❌ `sb_secret_...` - Service Role Key
- ❌ JWT tokens (eyJhbGci...)

## ✅ Token correto

Precisa ser um **Personal Access Token** que começa com `sbp_`

---

## 📝 COMO GERAR

### Passo 1: Acessar página de tokens
https://supabase.com/dashboard/account/tokens

### Passo 2: Gerar novo token
1. Clique em "Generate new token"
2. Nome: "SysHair Deploy"
3. Copie o token (começa com `sbp_`)

### Passo 3: Usar o token

```bash
cd "J:\AREA DE TRABALHO\Projetos\SysHair\syshair-main"

# Cole o token aqui (sbp_...)
export SUPABASE_ACCESS_TOKEN="sbp_SEU_TOKEN_AQUI"

# Link projeto
supabase link --project-ref jfjbpjnnfnuiezchhust

# Deploy funções
supabase functions deploy broadcast-messages-v2
supabase functions deploy broadcast-queue-worker
supabase functions deploy send-push-notification
supabase functions deploy auto-post-status

# Configurar secrets
supabase secrets set EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
supabase secrets set EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

---

## 🔄 ALTERNATIVA: Deploy Manual

Se não conseguir gerar o token, pode fazer deploy manual:

### Via Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions

2. Para cada função, clique em "Create a new function"

3. Copie o código dos arquivos:
   - `supabase/functions/broadcast-messages-v2/index.ts`
   - `supabase/functions/broadcast-queue-worker/index.ts`
   - `supabase/functions/send-push-notification/index.ts`
   - `supabase/functions/auto-post-status/index.ts`

4. Cole e clique em "Deploy"

---

## ⏱️ Tempo estimado

- Gerar token: 2 min
- Deploy via CLI: 5 min
- OU Deploy manual: 15 min

---

**Última atualização:** 04/03/2026 18:56
