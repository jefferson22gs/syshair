# ✅ CHECKLIST FINAL - DEPLOY DAS AUTOMAÇÕES

**Data:** 2026-02-18 19:05
**Status:** Aguardando deploy manual via Dashboard

---

## 🎯 O QUE VOCÊ PRECISA FAZER AGORA

### ✅ JÁ FEITO:
- [x] SQL `EXECUTAR_AGORA_FINAL.sql` executado
- [x] SQL `AUTOMACOES_WHATSAPP.sql` executado
- [x] Código no GitHub (commit 6652dc9)
- [x] Deploy Vercel concluído

### ⏳ FALTA FAZER:

---

## 📋 PASSO 1: Criar Edge Function - auto-appointment-confirmation

### 1.1 Acessar Dashboard
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```

### 1.2 Criar Function
1. Clique em **"Create a new function"**
2. Nome: `auto-appointment-confirmation`
3. Clique em **"Create function"**

### 1.3 Colar Código
1. **DELETE TODO O CÓDIGO** padrão
2. Abra o arquivo: `DEPLOY_MANUAL_DASHBOARD.md`
3. Copie o código da seção "PASSO 2.2"
4. Cole no editor
5. Clique em **"Deploy"**

---

## 📋 PASSO 2: Criar Edge Function - auto-birthday-messages

### 2.1 Voltar para Functions
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```

### 2.2 Criar Function
1. Clique em **"Create a new function"**
2. Nome: `auto-birthday-messages`
3. Clique em **"Create function"**

### 2.3 Colar Código
1. **DELETE TODO O CÓDIGO** padrão
2. Abra o arquivo: `CODIGO_BIRTHDAY_FUNCTION.md`
3. Copie TODO o código
4. Cole no editor
5. Clique em **"Deploy"**

---

## 📋 PASSO 3: Configurar Secrets (Variáveis de Ambiente)

### 3.1 Acessar Settings
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions
```

### 3.2 Adicionar Secrets
Role até a seção **"Secrets"** e adicione:

**Secret 1:**
- Name: `EVOLUTION_API_URL`
- Value: `https://api.tubaraoemprestimo.com.br`
- Clique em **"Save"**

**Secret 2:**
- Name: `EVOLUTION_API_KEY`
- Value: `B8959800-F546-407C-99E8-C40306E747F5`
- Clique em **"Save"**

---

## 📋 PASSO 4: Configurar Cron Job (Aniversários Diários)

### 4.1 Acessar Cron Jobs
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/database/cron-jobs
```

### 4.2 Criar Cron Job
1. Clique em **"Create a new cron job"**
2. Preencha:

**Name:**
```
Birthday Messages Daily
```

**Schedule:**
```
0 9 * * *
```
(Todos os dias às 9h UTC = 6h Brasília)

**Command:**
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

3. Clique em **"Create cron job"**

---

## 📋 PASSO 5: Configurar Salão

### 5.1 Acessar Admin
```
https://syshair.vercel.app/admin/settings
```

### 5.2 Preencher Configurações
No formulário de configurações do salão, preencha:

- **WhatsApp Instance Name:** (ex: "salao123" - o nome da sua instância Evolution)
- **Auto Confirm Appointments:** ✅ Ativado
- **Auto Birthday Messages:** ✅ Ativado
- **Birthday Discount Percent:** 10 (ou outro valor)
- **Chave PIX:** Sua chave PIX

### 5.3 Salvar
Clique em **"Salvar"**

---

## 🧪 PASSO 6: Testar

### Teste 1: Verificar Functions Deployadas
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```
Você deve ver:
- ✅ auto-appointment-confirmation
- ✅ auto-birthday-messages

### Teste 2: Fazer um Agendamento
1. Acesse a página pública do salão
2. Faça um agendamento completo
3. Preencha todos os dados (incluindo telefone)
4. Confirme
5. **Verifique se o WhatsApp foi enviado**

### Teste 3: Ver Logs
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
```
1. Clique em `auto-appointment-confirmation`
2. Vá na aba **"Logs"**
3. Veja se apareceu o log do envio

### Teste 4: Verificar Banco de Dados
```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/editor
```
Execute:
```sql
SELECT * FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ CHECKLIST COMPLETO

### Edge Functions
- [ ] Function `auto-appointment-confirmation` criada
- [ ] Function `auto-appointment-confirmation` deployada
- [ ] Function `auto-birthday-messages` criada
- [ ] Function `auto-birthday-messages` deployada

### Configurações
- [ ] Secret `EVOLUTION_API_URL` configurado
- [ ] Secret `EVOLUTION_API_KEY` configurado
- [ ] Cron job criado

### Salão
- [ ] WhatsApp Instance Name configurado
- [ ] Chave PIX configurada
- [ ] Automações ativadas

### Testes
- [ ] Agendamento testado
- [ ] WhatsApp recebido
- [ ] Logs verificados
- [ ] Banco de dados verificado

---

## 📚 ARQUIVOS DE REFERÊNCIA

1. **DEPLOY_MANUAL_DASHBOARD.md** - Guia completo passo a passo
2. **CODIGO_BIRTHDAY_FUNCTION.md** - Código completo da função de aniversário
3. **GUIA_AUTOMACOES_WHATSAPP.md** - Documentação completa
4. **RESUMO_FINAL_COMPLETO.md** - Resumo de tudo que foi feito

---

## 🆘 PRECISA DE AJUDA?

### Problema: Function não aparece
- Aguarde 1-2 minutos após o deploy
- Recarregue a página

### Problema: Erro ao deployar
- Verifique se copiou TODO o código
- Verifique se deletou o código padrão antes

### Problema: WhatsApp não envia
- Verifique se os Secrets foram configurados
- Verifique se o salão tem `whatsapp_instance_name`
- Verifique se a instância Evolution está conectada
- Veja os logs da function

### Problema: Cron job não executa
- Verifique se o comando SQL está correto
- Aguarde até o horário agendado (9h UTC)
- Ou teste manualmente via SQL Editor

---

## 🎉 QUANDO TUDO ESTIVER PRONTO

Você terá:
- ✅ Confirmação automática de agendamento via WhatsApp
- ✅ Mensagens de aniversário automáticas diárias
- ✅ Sistema completo de logs
- ✅ Notificações em tempo real no admin
- ✅ PIX exibido e enviado automaticamente

---

**Última Atualização:** 2026-02-18 19:05
**Status:** Aguardando deploy manual
**Tempo estimado:** 10-15 minutos
