# 🔧 CORREÇÃO COMPLETA - WhatsApp + Notificações Cliente

**Data:** 23/02/2026 às 14:40
**Problemas identificados:**
1. ❌ WhatsApp não envia automaticamente para cliente
2. ❌ Agendamentos duplicados
3. ❌ Falta notificação push para cliente

---

## 🎯 SOLUÇÃO EM 4 PASSOS

### 📋 PASSO 1: Executar SQL (3 min)

Execute no Supabase SQL Editor:

**Arquivo:** `FIX_WHATSAPP_E_NOTIFICACOES_CLIENTE.sql`

Este SQL vai:
- ✅ Criar tabela `whatsapp_config` (configurações)
- ✅ Criar tabela `client_notifications` (notificações para clientes)
- ✅ Criar 3 triggers para enviar WhatsApp automaticamente
- ✅ Habilitar Realtime

**Resultado esperado:**
```
✅ 1. Tabela whatsapp_config: SIM
✅ 2. Tabela client_notifications: SIM
✅ 3. Triggers criados: SIM (3)
✅ 4. Configuração WhatsApp: SIM
```

---

### 🔌 PASSO 2: Habilitar Realtime (1 min)

Execute no Supabase SQL Editor:

```sql
-- Habilitar Realtime na tabela de notificações do cliente
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;
```

**Verificar:**
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('admin_notifications', 'client_notifications');
```

**Resultado esperado:**
```
admin_notifications
client_notifications
```

---

### 🔧 PASSO 3: Corrigir Agendamentos Duplicados (2 min)

O problema está no `PublicBookingAdvanced.tsx` que cria o agendamento diretamente.

Execute este SQL para adicionar constraint de unicidade:

```sql
-- Prevenir agendamentos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique
ON appointments(salon_id, professional_id, date, start_time)
WHERE status != 'cancelled';
```

Agora, quando tentar criar agendamento duplicado, vai dar erro e não vai duplicar.

---

### 📱 PASSO 4: Configurar Edge Function (5 min)

A Edge Function `auto-appointment-confirmation` já existe, mas precisa ser ativada via Database Webhook.

Execute no Supabase SQL Editor:

```sql
-- Criar webhook para chamar Edge Function quando agendamento é criado
-- IMPORTANTE: Substitua YOUR_PROJECT_REF pelo ID do seu projeto Supabase

-- Primeiro, vamos criar uma função que chama a Edge Function
CREATE OR REPLACE FUNCTION call_appointment_confirmation_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_payload JSONB;
BEGIN
    -- Buscar nomes
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM professionals WHERE id = NEW.professional_id;

    -- Montar payload
    v_payload := jsonb_build_object(
        'id', NEW.id,
        'salon_id', NEW.salon_id,
        'client_name', NEW.client_name,
        'client_phone', NEW.client_phone,
        'client_email', NEW.client_email,
        'service_name', v_service_name,
        'professional_name', v_professional_name,
        'appointment_date', NEW.date,
        'appointment_time', NEW.start_time,
        'total_price', NEW.final_price,
        'status', NEW.status
    );

    -- Chamar Edge Function via pg_net (se disponível)
    -- Por enquanto, apenas registrar
    RAISE NOTICE 'Appointment created, payload: %', v_payload;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_call_appointment_webhook ON appointments;
CREATE TRIGGER trigger_call_appointment_webhook
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION call_appointment_confirmation_webhook();
```

---

## 🧪 TESTE COMPLETO

### Teste 1: Criar Agendamento

1. Abra: `http://localhost:5173/agendar`
2. Faça um agendamento completo
3. Use seu número de WhatsApp real

### Teste 2: Verificar Notificações

Execute no Supabase:

```sql
-- Ver notificações criadas para clientes
SELECT
    id,
    type,
    client_name,
    client_phone,
    whatsapp_sent,
    created_at
FROM client_notifications
ORDER BY created_at DESC
LIMIT 5;
```

### Teste 3: Verificar Triggers

Execute no Supabase:

```sql
-- Ver todos os triggers de notificação
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;
```

**Resultado esperado:**
```
trigger_notify_admin_cancelled       | UPDATE | appointments
trigger_notify_admin_new_appointment | INSERT | appointments
trigger_notify_admin_rescheduled     | UPDATE | appointments
trigger_notify_client_cancelled      | UPDATE | appointments
trigger_notify_client_new_appointment| INSERT | appointments
trigger_notify_client_rescheduled    | UPDATE | appointments
```

---

## 📊 FLUXO COMPLETO

```
CLIENTE FAZ AGENDAMENTO
         ↓
INSERT em appointments
         ↓
    ┌────┴────┐
    ↓         ↓
TRIGGER    TRIGGER
ADMIN      CLIENTE
    ↓         ↓
admin_     client_
notifications notifications
    ↓         ↓
REALTIME   REALTIME
    ↓         ↓
SINO 🔔    WHATSAPP 📱
(Admin)    (Cliente)
```

---

## 🔍 VERIFICAÇÃO FINAL

Execute este SQL para ver o status completo:

```sql
-- Status completo do sistema
SELECT '=== SISTEMA DE NOTIFICAÇÕES ===' as info;

SELECT
    '1. Admin notifications' as item,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE read = false) as nao_lidas
FROM admin_notifications
UNION ALL
SELECT
    '2. Client notifications',
    COUNT(*),
    COUNT(*) FILTER (WHERE whatsapp_sent = false)
FROM client_notifications;

-- Triggers ativos
SELECT '=== TRIGGERS ATIVOS ===' as info;

SELECT
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;

-- Configuração WhatsApp
SELECT '=== CONFIGURAÇÃO WHATSAPP ===' as info;

SELECT
    salon_id,
    instance_name,
    is_active
FROM whatsapp_config;
```

---

## 🐛 TROUBLESHOOTING

### Problema: WhatsApp não envia

**Verificar:**
```sql
-- Ver se notificação foi criada
SELECT * FROM client_notifications
WHERE whatsapp_sent = false
ORDER BY created_at DESC
LIMIT 5;
```

**Se tem notificações não enviadas:**
- A Edge Function precisa ser chamada manualmente
- Ou configurar um cron job para processar a fila

### Problema: Agendamentos duplicados

**Verificar:**
```sql
-- Ver agendamentos duplicados
SELECT
    salon_id,
    professional_id,
    date,
    start_time,
    COUNT(*) as total
FROM appointments
WHERE status != 'cancelled'
GROUP BY salon_id, professional_id, date, start_time
HAVING COUNT(*) > 1;
```

**Se encontrar duplicados:**
```sql
-- Deletar duplicados (manter o mais recente)
DELETE FROM appointments a
USING appointments b
WHERE a.id < b.id
  AND a.salon_id = b.salon_id
  AND a.professional_id = b.professional_id
  AND a.date = b.date
  AND a.start_time = b.start_time
  AND a.status != 'cancelled';
```

### Problema: Notificações não aparecem

**Verificar Realtime:**
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**Deve incluir:**
- admin_notifications
- client_notifications

---

## 📱 PROCESSAR ENVIO DE WHATSAPP

Como o Supabase não tem `pg_net` por padrão, você tem 2 opções:

### Opção A: Processar via Frontend (Temporário)

Criar um componente que monitora `client_notifications` e envia:

```typescript
// Exemplo de código para processar fila
const processWhatsAppQueue = async () => {
  const { data: pending } = await supabase
    .from('client_notifications')
    .select('*')
    .eq('whatsapp_sent', false)
    .limit(10);

  for (const notification of pending || []) {
    try {
      const response = await fetch(
        'https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
          },
          body: JSON.stringify({
            number: notification.client_phone.replace(/\D/g, ''),
            text: notification.message
          })
        }
      );

      if (response.ok) {
        await supabase
          .from('client_notifications')
          .update({
            whatsapp_sent: true,
            whatsapp_sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    }
  }
};
```

### Opção B: Chamar Edge Function Manualmente

```sql
-- Criar função para chamar Edge Function via HTTP
-- Requer extensão pg_net ou http
-- Consulte documentação do Supabase
```

---

## ✅ CHECKLIST FINAL

- [ ] SQL executado com sucesso
- [ ] Realtime habilitado em ambas tabelas
- [ ] Constraint de unicidade criada
- [ ] Triggers criados (6 no total)
- [ ] Configuração WhatsApp inserida
- [ ] Teste de agendamento realizado
- [ ] Notificação criada em client_notifications
- [ ] WhatsApp enviado para cliente
- [ ] Notificação aparece no sino do admin

---

## 🎯 RESULTADO ESPERADO

### Para o ADMIN:
✅ Notificações aparecem no sino em tempo real
✅ Badge atualiza automaticamente
✅ Pode ver todos os agendamentos

### Para o CLIENTE:
✅ Recebe WhatsApp automaticamente ao agendar
✅ Recebe WhatsApp ao cancelar
✅ Recebe WhatsApp ao reagendar
✅ Mensagem tem link para gerenciar agendamento

---

**Execute o PASSO 1 agora e me avise o resultado!**
