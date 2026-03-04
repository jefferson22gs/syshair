# 🚀 EXECUTE AGORA - DEPLOY FINAL

**Tempo estimado:** 32 minutos
**Data:** 04/03/2026 18:53

---

## ✅ JÁ ESTÁ PRONTO

- ✅ Código no GitHub
- ✅ Vercel fazendo deploy
- ✅ Supabase CLI instalado
- ✅ API Evolution funcionando

---

## 🎯 FALTA APENAS ISSO

### PASSO 1: Token Supabase (2 min)

1. Abra: https://supabase.com/dashboard/account/tokens
2. Clique "Generate new token"
3. Nome: "SysHair Deploy"
4. Copie o token

### PASSO 2: Deploy Automático (5 min)

Abra o terminal e cole:

```bash
cd "J:\AREA DE TRABALHO\Projetos\SysHair\syshair-main"

# Cole seu token aqui
export SUPABASE_ACCESS_TOKEN="COLE_SEU_TOKEN_AQUI"

# Link projeto
supabase link --project-ref jfjbpjnnfnuiezchhust

# Deploy funções
supabase functions deploy broadcast-messages-v2
supabase functions deploy broadcast-queue-worker
supabase functions deploy send-push-notification
supabase functions deploy auto-post-status

# Configurar variáveis
supabase secrets set EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
supabase secrets set EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

### PASSO 3: Migrations SQL (15 min)

1. Abra: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

2. Execute NA ORDEM (copie e cole cada arquivo):

```
1. supabase/migrations/20260304_fix_broadcast_system.sql
2. supabase/migrations/20260304_appointment_modification_system.sql
3. supabase/migrations/20260304_push_notifications_system.sql
4. supabase/migrations/20260304_google_calendar_integration.sql
5. supabase/migrations/20260304_auto_status_whatsapp.sql
6. supabase/migrations/20260304_pwa_personalized_system.sql
7. supabase/migrations/20260304_improved_schedule_view.sql
8. supabase/migrations/20260304_setup_cron_jobs.sql
```

Cada um deve retornar "Success".

### PASSO 4: Configurar Salão (5 min)

No SQL Editor, execute:

```sql
-- Ver salões
SELECT id, name, slug FROM salons;

-- Configurar (substitua SEU_SALON_ID)
UPDATE salons
SET
    whatsapp_instance_name = 'tubarao',
    pix_key = 'SUA_CHAVE_PIX',
    auto_confirm_appointments = true,
    auto_birthday_messages = true,
    birthday_discount_percent = 10,
    auto_post_status_enabled = true,
    auto_post_time = '09:00',
    auto_post_message = 'Agende online: https://syshair.app/agendar/' || slug,
    pwa_name = name || ' - Agendamento',
    pwa_short_name = LEFT(name, 12),
    pwa_enabled = true,
    pwa_theme_color = '#c9a227'
WHERE id = 'SEU_SALON_ID';
```

### PASSO 5: Testar (5 min)

No SQL Editor:

```sql
-- Verificar tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'broadcast_queue',
    'google_calendar_tokens',
    'status_post_history',
    'pwa_installations'
  );

-- Verificar cron jobs
SELECT jobid, schedule, command, active
FROM cron.job
ORDER BY jobid;

-- Testar worker
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);
```

---

## 🎉 PRONTO!

Após executar tudo:

✅ Disparador WhatsApp funcionando
✅ Confirmação automática
✅ Mensagens de aniversário
✅ Notificações push
✅ Cliente cancela/altera
✅ PWA instalável
✅ Google Calendar
✅ Auto-post status
✅ Agenda melhorada

**Sistema 100% funcional e superior à concorrência!**

---

## 📞 Dúvidas?

Consulte os guias completos no repositório:
- DEPLOY_AUTOMATICO.md
- GUIA_IMPLEMENTACAO_COMPLETO.md
- COMANDOS_RAPIDOS.md

WhatsApp: +55 11 98626-2240

---

**Última atualização:** 04/03/2026 18:53
