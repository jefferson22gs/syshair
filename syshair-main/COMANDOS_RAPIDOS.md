# ⚡ COMANDOS RÁPIDOS - Verificação de Notificações

**Data:** 23/02/2026 às 13:13
**Use estes comandos para verificar o sistema rapidamente**

---

## 🔍 VERIFICAÇÃO RÁPIDA (30 segundos)

### Execute no Supabase SQL Editor:

```sql
-- ✅ VERIFICAÇÃO COMPLETA EM 1 COMANDO
SELECT
    '1. Tabela existe' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'admin_notifications'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END as status
UNION ALL
SELECT
    '2. RLS habilitado',
    CASE WHEN (
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'admin_notifications'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '3. Políticas criadas',
    CASE WHEN (
        SELECT COUNT(*)
        FROM pg_policies
        WHERE tablename = 'admin_notifications'
    ) >= 4 THEN '✅ SIM (' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'admin_notifications') || ')' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '4. Triggers criados',
    CASE WHEN (
        SELECT COUNT(*)
        FROM information_schema.triggers
        WHERE event_object_table = 'appointments'
          AND trigger_name LIKE '%notify_admin%'
    ) >= 3 THEN '✅ SIM (' || (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'appointments' AND trigger_name LIKE '%notify_admin%') || ')' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '5. Notificações existem',
    CASE WHEN (
        SELECT COUNT(*)
        FROM admin_notifications
    ) > 0 THEN '✅ SIM (' || (SELECT COUNT(*) FROM admin_notifications) || ')' ELSE '⚠️ VAZIO' END;
```

**Resultado esperado:**
```
1. Tabela existe        ✅ SIM
2. RLS habilitado       ✅ SIM
3. Políticas criadas    ✅ SIM (4)
4. Triggers criados     ✅ SIM (3)
5. Notificações existem ✅ SIM (1)
```

---

## 📊 COMANDOS INDIVIDUAIS

### 1. Ver Últimas Notificações
```sql
SELECT
    id,
    type,
    title,
    message,
    client_name,
    read,
    to_char(created_at, 'DD/MM/YYYY HH24:MI:SS') as criado_em
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Contar Notificações Não Lidas
```sql
SELECT
    salon_id,
    COUNT(*) as nao_lidas
FROM admin_notifications
WHERE read = false
GROUP BY salon_id;
```

### 3. Ver Triggers Ativos
```sql
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
  AND trigger_name LIKE '%notify_admin%'
ORDER BY trigger_name;
```

### 4. Ver Políticas RLS
```sql
SELECT
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'admin_notifications'
ORDER BY policyname;
```

### 5. Ver Estrutura da Tabela
```sql
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;
```

---

## 🧪 COMANDOS DE TESTE

### Criar Notificação de Teste
```sql
INSERT INTO admin_notifications (
    salon_id,
    type,
    title,
    message,
    client_name,
    client_phone,
    appointment_date,
    appointment_time
)
SELECT
    s.id,
    'new_appointment',
    '🧪 Teste Manual - ' || to_char(NOW(), 'HH24:MI:SS'),
    'Notificação de teste criada manualmente em ' || to_char(NOW(), 'DD/MM/YYYY às HH24:MI:SS'),
    'Cliente Teste',
    '11999999999',
    CURRENT_DATE,
    CURRENT_TIME
FROM salons s
WHERE s.is_active = true
LIMIT 1;
```

### Criar Agendamento de Teste (Dispara Trigger)
```sql
INSERT INTO appointments (
    salon_id,
    service_id,
    professional_id,
    client_name,
    client_phone,
    date,
    start_time,
    end_time,
    status,
    price,
    final_price
)
SELECT
    s.id as salon_id,
    srv.id as service_id,
    p.id as professional_id,
    'Cliente Teste Trigger' as client_name,
    '11999999999' as client_phone,
    CURRENT_DATE as date,
    '14:00' as start_time,
    '15:00' as end_time,
    'confirmed' as status,
    100.00 as price,
    100.00 as final_price
FROM salons s
CROSS JOIN services srv
CROSS JOIN professionals p
WHERE s.is_active = true
  AND srv.is_active = true
  AND p.is_active = true
LIMIT 1;

-- Verificar se criou notificação
SELECT * FROM admin_notifications
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🧹 COMANDOS DE LIMPEZA

### Marcar Todas como Lidas
```sql
UPDATE admin_notifications
SET read = true
WHERE salon_id = '31a1af0c-3549-4250-ae27-03a46e3dce5a';
```

### Deletar Notificações de Teste
```sql
DELETE FROM admin_notifications
WHERE client_name LIKE '%Teste%';
```

### Deletar Notificações Antigas (> 30 dias)
```sql
DELETE FROM admin_notifications
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 🔧 COMANDOS DE CORREÇÃO

### Recriar Políticas RLS
```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Salon owners can view their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can update their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can delete their notifications" ON admin_notifications;

-- Criar políticas novas
CREATE POLICY "Salon owners can view their notifications"
ON admin_notifications FOR SELECT
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

CREATE POLICY "System can insert notifications"
ON admin_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Salon owners can update their notifications"
ON admin_notifications FOR UPDATE
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

CREATE POLICY "Salon owners can delete their notifications"
ON admin_notifications FOR DELETE
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));
```

### Recriar Triggers
```sql
-- Remover triggers antigos
DROP TRIGGER IF EXISTS trigger_notify_admin_new_appointment ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_cancelled ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_rescheduled ON appointments;

-- Criar triggers novos
CREATE TRIGGER trigger_notify_admin_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_new_appointment();

CREATE TRIGGER trigger_notify_admin_cancelled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_cancelled_appointment();

CREATE TRIGGER trigger_notify_admin_rescheduled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_rescheduled_appointment();
```

---

## 📈 COMANDOS DE MONITORAMENTO

### Estatísticas de Notificações
```sql
SELECT
    type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE read = false) as nao_lidas,
    COUNT(*) FILTER (WHERE read = true) as lidas,
    to_char(MIN(created_at), 'DD/MM/YYYY') as primeira,
    to_char(MAX(created_at), 'DD/MM/YYYY') as ultima
FROM admin_notifications
GROUP BY type
ORDER BY total DESC;
```

### Notificações por Dia (Últimos 7 dias)
```sql
SELECT
    to_char(created_at, 'DD/MM/YYYY') as dia,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE type = 'new_appointment') as novos,
    COUNT(*) FILTER (WHERE type = 'cancelled_appointment') as cancelados,
    COUNT(*) FILTER (WHERE type = 'rescheduled_appointment') as reagendados
FROM admin_notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY to_char(created_at, 'DD/MM/YYYY')
ORDER BY MIN(created_at) DESC;
```

### Notificações por Hora (Hoje)
```sql
SELECT
    to_char(created_at, 'HH24:00') as hora,
    COUNT(*) as total
FROM admin_notifications
WHERE created_at >= CURRENT_DATE
GROUP BY to_char(created_at, 'HH24:00')
ORDER BY hora;
```

---

## 🔍 COMANDOS DE DEBUG

### Ver Último Erro (Se houver)
```sql
SELECT
    id,
    type,
    title,
    message,
    metadata,
    created_at
FROM admin_notifications
WHERE metadata->>'error' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### Ver Notificações de um Cliente Específico
```sql
SELECT
    id,
    type,
    title,
    message,
    read,
    created_at
FROM admin_notifications
WHERE client_phone = '11987654321'
ORDER BY created_at DESC;
```

### Ver Notificações de um Agendamento Específico
```sql
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    a.status as appointment_status,
    a.date as appointment_date
FROM admin_notifications n
LEFT JOIN appointments a ON a.id = n.appointment_id
WHERE n.appointment_id = 'SEU_APPOINTMENT_ID_AQUI'
ORDER BY n.created_at DESC;
```

---

## 🚨 COMANDOS DE EMERGÊNCIA

### Desabilitar Triggers Temporariamente
```sql
ALTER TABLE appointments DISABLE TRIGGER trigger_notify_admin_new_appointment;
ALTER TABLE appointments DISABLE TRIGGER trigger_notify_admin_cancelled;
ALTER TABLE appointments DISABLE TRIGGER trigger_notify_admin_rescheduled;
```

### Reabilitar Triggers
```sql
ALTER TABLE appointments ENABLE TRIGGER trigger_notify_admin_new_appointment;
ALTER TABLE appointments ENABLE TRIGGER trigger_notify_admin_cancelled;
ALTER TABLE appointments ENABLE TRIGGER trigger_notify_admin_rescheduled;
```

### Limpar TODAS as Notificações (CUIDADO!)
```sql
-- ⚠️ ISSO DELETA TUDO! Use com cuidado!
TRUNCATE admin_notifications;
```

---

## 💻 COMANDOS DO CONSOLE DO NAVEGADOR

### Verificar Status do Canal Realtime
```javascript
// Cole no console do navegador (F12)
console.log('Status do canal:', supabase.getChannels());
```

### Forçar Reconexão
```javascript
// Cole no console do navegador
window.location.reload();
```

### Ver Estado das Notificações
```javascript
// Cole no console do navegador (na página do admin)
// Isso mostra o estado interno do React
console.log('Notificações:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO RÁPIDA

Execute estes comandos em ordem:

1. **Verificação Completa** (primeiro comando deste arquivo)
2. **Ver Últimas Notificações** (deve ter pelo menos 1)
3. **Ver Triggers Ativos** (deve ter 3)
4. **Ver Políticas RLS** (deve ter 4)

Se todos retornarem ✅, o sistema está funcionando!

---

## 🎯 COMANDO ÚNICO PARA COPIAR/COLAR

```sql
-- VERIFICAÇÃO COMPLETA + ÚLTIMAS NOTIFICAÇÕES
SELECT '=== VERIFICAÇÃO DO SISTEMA ===' as info;

SELECT
    '1. Tabela existe' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_notifications')
    THEN '✅ SIM' ELSE '❌ NÃO' END as status
UNION ALL SELECT '2. RLS habilitado',
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'admin_notifications')
    THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL SELECT '3. Políticas criadas',
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'admin_notifications') >= 4
    THEN '✅ SIM (' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'admin_notifications') || ')' ELSE '❌ NÃO' END
UNION ALL SELECT '4. Triggers criados',
    CASE WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'appointments' AND trigger_name LIKE '%notify_admin%') >= 3
    THEN '✅ SIM (' || (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'appointments' AND trigger_name LIKE '%notify_admin%') || ')' ELSE '❌ NÃO' END
UNION ALL SELECT '5. Notificações existem',
    CASE WHEN (SELECT COUNT(*) FROM admin_notifications) > 0
    THEN '✅ SIM (' || (SELECT COUNT(*) FROM admin_notifications) || ')' ELSE '⚠️ VAZIO' END;

SELECT '=== ÚLTIMAS NOTIFICAÇÕES ===' as info;

SELECT id, type, title, client_name, read, to_char(created_at, 'DD/MM/YYYY HH24:MI:SS') as criado_em
FROM admin_notifications ORDER BY created_at DESC LIMIT 5;
```

**Copie e cole este comando no SQL Editor do Supabase para verificar tudo de uma vez!**

---

**Salve este arquivo para referência futura!**

**Use sempre que precisar verificar o sistema rapidamente.**
