# 🚀 DEPLOY AUTOMÁTICO - SUPABASE CLI INSTALADO!

**Data:** 04/03/2026 18:50
**Status:** Supabase CLI v2.75.0 instalado com sucesso!

---

## ✅ PROGRESSO ATUAL

- ✅ Código enviado para GitHub
- ✅ Vercel fazendo deploy automático
- ✅ Supabase CLI instalado (v2.75.0)
- ✅ API Evolution testada e funcionando
- ⏳ Aguardando token de acesso do Supabase

---

## 🔑 OBTER TOKEN DO SUPABASE

### Passo 1: Gerar Access Token

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Nome: "SysHair Deploy"
4. Copie o token gerado

### Passo 2: Executar Deploy

Abra o terminal e execute:

```bash
cd "J:\AREA DE TRABALHO\Projetos\SysHair\syshair-main"

# Definir token (substitua SEU_TOKEN_AQUI pelo token copiado)
export SUPABASE_ACCESS_TOKEN="SEU_TOKEN_AQUI"

# Link projeto
supabase link --project-ref jfjbpjnnfnuiezchhust

# Deploy Edge Functions
supabase functions deploy broadcast-messages-v2
supabase functions deploy broadcast-queue-worker
supabase functions deploy send-push-notification
supabase functions deploy auto-post-status

# Configurar variáveis de ambiente
supabase secrets set EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
supabase secrets set EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

---

## 📋 CHECKLIST COMPLETO

### Backend (Supabase)

#### Migrations SQL
- [ ] 1. fix_broadcast_system.sql
- [ ] 2. appointment_modification_system.sql
- [ ] 3. push_notifications_system.sql
- [ ] 4. google_calendar_integration.sql
- [ ] 5. auto_status_whatsapp.sql
- [ ] 6. pwa_personalized_system.sql
- [ ] 7. improved_schedule_view.sql
- [ ] 8. setup_cron_jobs.sql

**Como executar:**
- Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
- Copie e cole cada arquivo na ordem
- Clique em "Run"

#### Edge Functions
- [ ] broadcast-messages-v2
- [ ] broadcast-queue-worker
- [ ] send-push-notification
- [ ] auto-post-status

**Como executar:**
- Use os comandos acima com o token

#### Variáveis de Ambiente
- [ ] EVOLUTION_API_URL
- [ ] EVOLUTION_API_KEY

**Como executar:**
- Use os comandos acima com o token

### Frontend (Vercel)
- [✅] Deploy automático em andamento

### Configuração
- [ ] Configurar salão no banco de dados
- [ ] Testar todas as funcionalidades

---

## 🧪 TESTES APÓS DEPLOY

### 1. Verificar Tabelas
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
**Esperado:** 4 tabelas

### 2. Verificar Cron Jobs
```sql
SELECT jobid, schedule, command, active
FROM cron.job
ORDER BY jobid;
```
**Esperado:** 7 jobs ativos

### 3. Verificar Edge Functions
```sql
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/broadcast-queue-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
);
```
**Esperado:** Resposta JSON com sucesso

### 4. Testar Disparador WhatsApp
1. Acesse o frontend
2. Vá em Broadcast Messages
3. Selecione 2-3 contatos
4. Envie mensagem de teste
5. Verifique no SQL:
```sql
SELECT status, COUNT(*) FROM broadcast_queue GROUP BY status;
```

---

## 🎯 CONFIGURAÇÃO DO SALÃO

Após tudo deployado, configure seu salão:

```sql
-- Obter ID do salão
SELECT id, name, slug FROM salons;

-- Configurar (substitua SEU_SALON_ID)
UPDATE salons
SET
    -- WhatsApp
    whatsapp_instance_name = 'tubarao',  -- ou syshair_daniel_cabelos_1777c2a7
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
    pwa_theme_color = '#c9a227'
WHERE id = 'SEU_SALON_ID';
```

---

## 📊 INSTÂNCIAS WHATSAPP DISPONÍVEIS

Encontradas na API Evolution:

1. **tubarao**
   - Status: ✅ Conectado
   - Número: +55 11 98626-2240
   - Nome: Código Base

2. **syshair_daniel_cabelos_1777c2a7**
   - Status: ✅ Conectado
   - Número: +55 19 98214-3580
   - Nome: Daniel Cabelos

3. **syshair_jefferson_santos_31a1af0c**
   - Status: ❌ Desconectado
   - Número: +55 11 96162-6897
   - Nome: Jefferson Santos

---

## ⏱️ TEMPO ESTIMADO

- Obter token: 2 min
- Deploy Edge Functions: 5 min
- Executar Migrations: 15 min
- Configurar salão: 3 min
- Testes: 10 min

**Total: ~35 minutos**

---

## 🎉 RESULTADO FINAL

Após completar todos os passos:

✅ Sistema 100% funcional
✅ Disparador WhatsApp operacional
✅ Todas as automações ativas
✅ Notificações push funcionando
✅ PWA instalável
✅ Superior à concorrência

---

## 📞 SUPORTE

Dúvidas? Consulte:
- GUIA_IMPLEMENTACAO_COMPLETO.md
- COMANDOS_RAPIDOS.md
- STATUS_DEPLOY.md

---

**Última atualização:** 04/03/2026 18:50
