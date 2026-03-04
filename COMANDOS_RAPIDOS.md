# 🎯 COMANDOS RÁPIDOS - SYSHAIR

**Referência rápida para deploy e manutenção**

---

## 🚀 DEPLOY COMPLETO

### 1. Executar Migrations (SQL Editor do Supabase)

```sql
-- Copiar e colar cada arquivo na ordem:

-- 1. Sistema de broadcast corrigido
-- Arquivo: 20260304_fix_broadcast_system.sql

-- 2. Sistema de cancelamento/alteração
-- Arquivo: 20260304_appointment_modification_system.sql

-- 3. Sistema de notificações push
-- Arquivo: 20260304_push_notifications_system.sql

-- 4. Integração Google Calendar
-- Arquivo: 20260304_google_calendar_integration.sql

-- 5. Auto-post status WhatsApp
-- Arquivo: 20260304_auto_status_whatsapp.sql

-- 6. PWA personalizado
-- Arquivo: 20260304_pwa_personalized_system.sql

-- 7. Melhorias na agenda
-- Arquivo: 20260304_improved_schedule_view.sql

-- 8. Configurar cron jobs
-- Arquivo: 20260304_setup_cron_jobs.sql
```

### 2. Deploy Edge Functions

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Link projeto
supabase link --project-ref jfjbpjnnfnuiezchhust

# Deploy todas as funções
supabase functions deploy broadcast-messages-v2
supabase functions deploy broadcast-queue-worker
supabase functions deploy auto-appointment-confirmation
supabase functions deploy auto-birthday-messages
supabase functions deploy send-push-notification
supabase functions deploy auto-post-status
```

### 3. Configurar Variáveis de Ambiente

```bash
# No dashboard do Supabase > Settings > Edge Functions
EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

---

## 🧪 TESTES RÁPIDOS

### Testar Disparador WhatsApp

```sql
-- Verificar queue
SELECT status, COUNT(*) FROM broadcast_queue GROUP BY status;

-- Processar manualmente
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
);
```

### Testar Mensagens de Aniversário

```sql
-- Criar cliente aniversariante
INSERT INTO clients (salon_id, name, phone, birth_date)
VALUES ('<SALON_ID>', 'Teste', '5511999999999', CURRENT_DATE);

-- Executar função
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
);
```

### Testar Auto-post Status

```sql
-- Habilitar para salão
UPDATE salons
SET auto_post_status_enabled = true,
    auto_post_time = '09:00'
WHERE id = '<SALON_ID>';

-- Executar manualmente
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-post-status',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
);
```

---

## 📊 MONITORAMENTO

### Verificar Cron Jobs

```sql
SELECT jobid, schedule, command, active
FROM cron.job
ORDER BY jobid;
```

### Verificar Queue de Broadcast

```sql
SELECT
    status,
    COUNT(*) as total,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
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
    progress_percent,
    last_activity_at
FROM broadcasts
WHERE status = 'processing'
ORDER BY created_at DESC;
```

### Logs de WhatsApp (últimas 24h)

```sql
SELECT
    message_type,
    status,
    COUNT(*) as count
FROM whatsapp_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY message_type, status;
```

### Notificações Pendentes

```sql
SELECT
    type,
    channel,
    COUNT(*) as count
FROM notifications
WHERE status = 'pending'
GROUP BY type, channel;
```

---

## 🔧 MANUTENÇÃO

### Limpar Queue Antiga

```sql
SELECT cleanup_old_broadcast_queue();
```

### Verificar Broadcasts Travados

```sql
-- Marcar como failed broadcasts sem atividade há 30+ minutos
UPDATE broadcasts
SET status = 'failed',
    error_message = 'Broadcast travado',
    completed_at = NOW()
WHERE status = 'processing'
  AND last_activity_at < NOW() - INTERVAL '30 minutes';
```

### Reprocessar Mensagens Falhadas

```sql
-- Voltar mensagens falhadas para pending (retry)
UPDATE broadcast_queue
SET status = 'pending',
    attempts = 0,
    scheduled_for = NOW()
WHERE status = 'failed'
  AND attempts < max_attempts
  AND created_at >= NOW() - INTERVAL '24 hours';
```

### Desativar Subscriptions Inválidas

```sql
UPDATE push_subscriptions
SET is_active = false
WHERE updated_at < NOW() - INTERVAL '90 days';
```

---

## 🐛 TROUBLESHOOTING

### Problema: Worker não processa

```sql
-- Verificar se cron está ativo
SELECT * FROM cron.job WHERE jobname = 'process-broadcast-queue';

-- Executar manualmente
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
);
```

### Problema: Mensagens não enviam

```sql
-- Verificar configuração do salão
SELECT
    id,
    name,
    whatsapp_instance_name,
    pix_key
FROM salons
WHERE id = '<SALON_ID>';

-- Verificar instância WhatsApp
SELECT * FROM whatsapp_instances
WHERE salon_id = '<SALON_ID>';
```

### Problema: Notificações não chegam

```sql
-- Verificar subscriptions ativas
SELECT COUNT(*) FROM push_subscriptions
WHERE salon_id = '<SALON_ID>'
  AND is_active = true;

-- Verificar notificações pendentes
SELECT * FROM notifications
WHERE salon_id = '<SALON_ID>'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📱 CONFIGURAÇÃO POR SALÃO

### Configurar WhatsApp

```sql
UPDATE salons
SET
    whatsapp_instance_name = 'nome_da_instancia',
    pix_key = 'sua_chave_pix',
    auto_confirm_appointments = true,
    auto_birthday_messages = true,
    birthday_discount_percent = 10
WHERE id = '<SALON_ID>';
```

### Configurar Auto-post Status

```sql
UPDATE salons
SET
    auto_post_status_enabled = true,
    auto_post_time = '09:00',
    auto_post_message = 'Sua mensagem personalizada aqui!'
WHERE id = '<SALON_ID>';
```

### Configurar PWA

```sql
UPDATE salons
SET
    pwa_name = 'Nome do Salão - Agendamento',
    pwa_short_name = 'Salão',
    pwa_description = 'Agende seus horários',
    pwa_theme_color = '#c9a227',
    pwa_background_color = '#0d1117',
    pwa_enabled = true
WHERE id = '<SALON_ID>';
```

---

## 🔑 VARIÁVEIS IMPORTANTES

```bash
# Supabase
SUPABASE_URL=https://jfjbpjnnfnuiezchhust.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Evolution API
EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5

# Base URL
BASE_URL=https://syshair.app
```

---

## 📞 SUPORTE

**Desenvolvedor:** Código Base
**WhatsApp:** +55 11 98626-2240
**Instagram:** @codigo.base

---

**Última atualização:** 04/03/2026 18:37
