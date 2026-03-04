# =====================================================
# DEPLOY MANUAL - PASSO A PASSO
# Use este guia se não conseguir executar o script
# =====================================================

## 📋 PRÉ-REQUISITOS

1. Acesso ao dashboard do Supabase
2. Credenciais de admin
3. Projeto ID: jfjbpjnnfnuiezchhust

---

## 🗄️ PASSO 1: EXECUTAR MIGRATIONS SQL

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

### Migration 1: Sistema de Broadcast
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_fix_broadcast_system.sql
```

### Migration 2: Cancelamento/Alteração
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_appointment_modification_system.sql
```

### Migration 3: Notificações Push
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_push_notifications_system.sql
```

### Migration 4: Google Calendar
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_google_calendar_integration.sql
```

### Migration 5: Auto-post Status
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_auto_status_whatsapp.sql
```

### Migration 6: PWA Personalizado
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_pwa_personalized_system.sql
```

### Migration 7: Melhorias na Agenda
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_improved_schedule_view.sql
```

### Migration 8: Cron Jobs
```sql
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260304_setup_cron_jobs.sql
```

**✅ Verificar:** Cada migration deve retornar "Success" ou mensagem de confirmação

---

## ⚡ PASSO 2: DEPLOY EDGE FUNCTIONS (VIA DASHBOARD)

Como o CLI não está disponível, vamos usar o dashboard do Supabase.

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions

### Função 1: broadcast-messages-v2
1. Clique em "Create a new function"
2. Nome: `broadcast-messages-v2`
3. Copie o código de: `supabase/functions/broadcast-messages-v2/index.ts`
4. Clique em "Deploy"

### Função 2: broadcast-queue-worker
1. Clique em "Create a new function"
2. Nome: `broadcast-queue-worker`
3. Copie o código de: `supabase/functions/broadcast-queue-worker/index.ts`
4. Clique em "Deploy"

### Função 3: send-push-notification
1. Clique em "Create a new function"
2. Nome: `send-push-notification`
3. Copie o código de: `supabase/functions/send-push-notification/index.ts`
4. Clique em "Deploy"

### Função 4: auto-post-status
1. Clique em "Create a new function"
2. Nome: `auto-post-status`
3. Copie o código de: `supabase/functions/auto-post-status/index.ts`
4. Clique em "Deploy"

**✅ Verificar:** Todas as funções devem aparecer como "Deployed"

---

## 🔧 PASSO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions

Adicione as seguintes variáveis:

```
EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

**✅ Verificar:** Variáveis salvas com sucesso

---

## 🧪 PASSO 4: TESTAR IMPLEMENTAÇÕES

### Teste 1: Verificar Tabelas Criadas
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'broadcast_queue',
    'google_calendar_tokens',
    'status_post_history',
    'pwa_installations'
  );
```
**Esperado:** 4 tabelas listadas

### Teste 2: Verificar Cron Jobs
```sql
SELECT jobid, schedule, command, active
FROM cron.job
ORDER BY jobid;
```
**Esperado:** 7 cron jobs ativos

### Teste 3: Verificar Edge Functions
```sql
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);
```
**Esperado:** Resposta JSON com sucesso

### Teste 4: Criar Broadcast de Teste
No frontend, acesse a página de Broadcast Messages e:
1. Carregue contatos
2. Selecione 1-2 contatos
3. Digite uma mensagem de teste
4. Envie

**Esperado:**
- Broadcast criado
- Mensagens na queue
- Worker processando

---

## 📊 PASSO 5: MONITORAMENTO

### Verificar Queue
```sql
SELECT
    status,
    COUNT(*) as total,
    MIN(created_at) as oldest
FROM broadcast_queue
GROUP BY status;
```

### Verificar Broadcasts Ativos
```sql
SELECT
    id,
    status,
    total_recipients,
    sent_count,
    failed_count,
    progress_percent
FROM broadcasts
WHERE status = 'processing'
ORDER BY created_at DESC;
```

### Verificar Logs de WhatsApp
```sql
SELECT
    message_type,
    status,
    COUNT(*) as count
FROM whatsapp_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY message_type, status;
```

---

## 🔧 PASSO 6: CONFIGURAR SALÃO

Execute para cada salão:

```sql
UPDATE salons
SET
    -- WhatsApp
    whatsapp_instance_name = 'NOME_DA_INSTANCIA',
    pix_key = 'SUA_CHAVE_PIX',
    auto_confirm_appointments = true,
    auto_birthday_messages = true,
    birthday_discount_percent = 10,

    -- Auto-post Status
    auto_post_status_enabled = true,
    auto_post_time = '09:00',
    auto_post_message = 'Agende online: https://syshair.app/agendar/' || slug,

    -- PWA
    pwa_name = name || ' - Agendamento',
    pwa_short_name = LEFT(name, 12),
    pwa_enabled = true,
    pwa_theme_color = COALESCE(primary_color, '#c9a227')
WHERE id = 'SEU_SALON_ID';
```

---

## ✅ CHECKLIST FINAL

- [ ] Todas as 8 migrations executadas
- [ ] Todas as 4 Edge Functions deployadas
- [ ] Variáveis de ambiente configuradas
- [ ] Cron jobs verificados (7 ativos)
- [ ] Testes executados com sucesso
- [ ] Salão configurado
- [ ] Monitoramento verificado

---

## 🐛 TROUBLESHOOTING

### Problema: Migration falha
**Solução:** Execute as migrations uma por vez e verifique erros específicos

### Problema: Edge Function não deploya
**Solução:** Verifique se o código está correto e sem erros de sintaxe

### Problema: Cron jobs não aparecem
**Solução:** Verifique se pg_cron extension está habilitada:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Problema: Worker não processa
**Solução:** Execute manualmente para verificar erros:
```sql
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);
```

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs no dashboard do Supabase
2. Execute os comandos de troubleshooting
3. Consulte COMANDOS_RAPIDOS.md
4. Entre em contato: +55 11 98626-2240

---

**Última atualização:** 04/03/2026 18:40
