# 🚀 DEPLOY DAS EDGE FUNCTIONS - PASSO A PASSO

## OPÇÃO 1: Via Supabase CLI (Recomendado)

### 1. Instalar Supabase CLI

**Windows (PowerShell como Administrador):**
```powershell
# Via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OU via NPM
npm install -g supabase
```

**Verificar instalação:**
```bash
supabase --version
```

### 2. Login no Supabase
```bash
supabase login
```
- Vai abrir o navegador
- Faça login com sua conta Supabase
- Autorize o acesso

### 3. Link com o Projeto
```bash
cd D:\Projetos\syshair-main
supabase link --project-ref jfjbpjnnfnuiezchhust
```
- Vai pedir a senha do banco (Database Password)
- Encontre em: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/database

### 4. Deploy das Functions
```bash
# Deploy da confirmação de agendamento
supabase functions deploy auto-appointment-confirmation

# Deploy das mensagens de aniversário
supabase functions deploy auto-birthday-messages
```

### 5. Configurar Variáveis de Ambiente
```bash
# Configurar EVOLUTION_API_URL
supabase secrets set EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br

# Configurar EVOLUTION_API_KEY
supabase secrets set EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

---

## OPÇÃO 2: Via Dashboard do Supabase (Manual)

### 1. Acessar Edge Functions
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```

### 2. Criar Function: auto-appointment-confirmation

1. Clique em **"Create a new function"**
2. Nome: `auto-appointment-confirmation`
3. Cole o código de: `supabase/functions/auto-appointment-confirmation/index.ts`
4. Clique em **"Deploy function"**

### 3. Criar Function: auto-birthday-messages

1. Clique em **"Create a new function"**
2. Nome: `auto-birthday-messages`
3. Cole o código de: `supabase/functions/auto-birthday-messages/index.ts`
4. Clique em **"Deploy function"**

### 4. Configurar Secrets (Variáveis de Ambiente)

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions
2. Na seção **"Secrets"**, adicione:
   - Nome: `EVOLUTION_API_URL`
   - Valor: `https://api.tubaraoemprestimo.com.br`
3. Adicione outro:
   - Nome: `EVOLUTION_API_KEY`
   - Valor: `B8959800-F546-407C-99E8-C40306E747F5`

---

## ✅ VERIFICAR SE FUNCIONOU

### Testar auto-appointment-confirmation
```bash
# Via curl (substitua SEU_ANON_KEY)
curl -X POST \
  'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-appointment-confirmation' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "test-123",
    "salon_id": "SEU_SALON_ID",
    "client_name": "Teste",
    "client_phone": "11999999999",
    "service_name": "Corte",
    "professional_name": "João",
    "appointment_date": "2026-02-20",
    "appointment_time": "14:00",
    "total_price": 50,
    "status": "pending"
  }'
```

### Testar auto-birthday-messages
```bash
curl -X POST \
  'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Ver Logs das Functions
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```
- Clique na function
- Vá em "Logs"

---

## 🔑 ONDE ENCONTRAR AS KEYS

### Anon Key (Public)
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/api
```
- Copie: `anon` `public`

### Service Role Key (Private)
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/api
```
- Copie: `service_role` (⚠️ Mantenha em segredo!)

### Database Password
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/database
```
- Se esqueceu, pode resetar

---

## 📋 CHECKLIST

- [ ] Supabase CLI instalado (ou usar dashboard)
- [ ] Login realizado
- [ ] Projeto linkado
- [ ] Function `auto-appointment-confirmation` deployada
- [ ] Function `auto-birthday-messages` deployada
- [ ] Secret `EVOLUTION_API_URL` configurado
- [ ] Secret `EVOLUTION_API_KEY` configurado
- [ ] Teste realizado
- [ ] Logs verificados

---

## ⚠️ PROBLEMAS COMUNS

### "Command not found: supabase"
- Reinstale: `npm install -g supabase`
- Ou use OPÇÃO 2 (Dashboard)

### "Failed to link project"
- Verifique a senha do banco
- Tente novamente com a senha correta

### "Function deployment failed"
- Verifique se o código está correto
- Veja os logs de erro no dashboard

### "Evolution API error"
- Verifique se as secrets foram configuradas
- Teste a API manualmente

---

## 🎯 PRÓXIMO PASSO APÓS DEPLOY

### Configurar Cron Job para Aniversários

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/database/cron-jobs
2. Clique em **"Create a new cron job"**
3. Preencha:
   - **Name:** Birthday Messages Daily
   - **Schedule:** `0 9 * * *` (Todos os dias às 9h UTC)
   - **Command:**
   ```sql
   SELECT net.http_post(
       url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
       headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
       ),
       body := '{}'::jsonb
   );
   ```
4. Clique em **"Create cron job"**

---

**Última Atualização:** 2026-02-18 19:00
**Status:** Aguardando deploy das Edge Functions
