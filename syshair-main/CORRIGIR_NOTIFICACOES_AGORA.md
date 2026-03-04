# 🔧 CORREÇÃO IMEDIATA - Notificações não aparecem

**Data:** 23/02/2026 às 13:08
**Problema:** Canal Realtime com erro "CHANNEL_ERROR" - notificações não aparecem no sino

---

## 🚨 DIAGNÓSTICO

**Erro no console:**
```
🔔 Status do canal de notificações: CLOSED
🔔 Status do canal de notificações: CHANNEL_ERROR
```

**Causa raiz:** Realtime não está habilitado na tabela `admin_notifications` no Supabase.

---

## ✅ SOLUÇÃO (5 MINUTOS)

### PASSO 1: Acessar Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto SysHair
3. Vá em **Database** → **Replication**

### PASSO 2: Habilitar Realtime na Tabela

1. Na página de Replication, procure a tabela **`admin_notifications`**
2. Se não aparecer, clique em **"0 tables"** para expandir
3. Encontre `admin_notifications` na lista
4. Clique no **toggle/switch** ao lado da tabela para **HABILITAR**
5. Aguarde alguns segundos até aparecer "Enabled"

**Captura de tela esperada:**
```
Tables
├─ admin_notifications  [✓ Enabled]  ← Deve estar assim
├─ appointments         [✓ Enabled]
├─ salons              [✓ Enabled]
```

### PASSO 3: Verificar RLS Policies

Execute no **SQL Editor** do Supabase:

```sql
-- Verificar se as políticas existem
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'admin_notifications';
```

**Resultado esperado:** 3 políticas
- "Salon owners can view their notifications" (SELECT)
- "Salon owners can update their notifications" (UPDATE)
- "Salon owners can delete their notifications" (DELETE)

**Se não aparecer nenhuma política, execute:**

```sql
-- Habilitar RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Política de SELECT
CREATE POLICY "Salon owners can view their notifications"
ON admin_notifications
FOR SELECT
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

-- Política de UPDATE
CREATE POLICY "Salon owners can update their notifications"
ON admin_notifications
FOR UPDATE
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

-- Política de DELETE
CREATE POLICY "Salon owners can delete their notifications"
ON admin_notifications
FOR DELETE
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

-- Política de INSERT (para triggers)
CREATE POLICY "System can insert notifications"
ON admin_notifications
FOR INSERT
WITH CHECK (true);
```

### PASSO 4: Verificar se a Tabela Existe

```sql
-- Verificar estrutura da tabela
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_notifications'
ORDER BY ordinal_position;
```

**Se não retornar nada, a tabela não existe. Execute:**

```sql
-- Criar tabela
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('new_appointment', 'cancelled_appointment', 'rescheduled_appointment')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    client_name TEXT,
    client_phone TEXT,
    appointment_date DATE,
    appointment_time TIME,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_admin_notifications_salon ON admin_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(salon_id, read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
```

### PASSO 5: Verificar Triggers

```sql
-- Verificar se os triggers existem
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
  AND trigger_name LIKE '%notify_admin%'
ORDER BY trigger_name;
```

**Resultado esperado:** 3 triggers
- `trigger_notify_admin_new_appointment` (INSERT)
- `trigger_notify_admin_cancelled` (UPDATE)
- `trigger_notify_admin_rescheduled` (UPDATE)

**Se não aparecer, execute o arquivo:**
`supabase/migrations/20260223_admin_notifications_system_fixed.sql`

### PASSO 6: Criar Notificação de Teste

```sql
-- Inserir notificação de teste
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
    '31a1af0c-3549-4250-ae27-03a46e3dce5a',
    'new_appointment',
    '🧪 Teste de Notificação',
    'Esta é uma notificação de teste. Se você está vendo isso, o sistema está funcionando!',
    'Cliente Teste',
    '11999999999',
    CURRENT_DATE,
    CURRENT_TIME;

-- Verificar se foi criada
SELECT
    id,
    type,
    title,
    message,
    read,
    created_at
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 1;
```

### PASSO 7: Testar no Frontend

1. Abra o navegador (F12 para DevTools)
2. Vá para a aba **Console**
3. Acesse: `http://localhost:5173/admin`
4. Procure por logs:
   - ✅ "🔔 Status do canal de notificações: SUBSCRIBED"
   - ✅ "🔔 Canal de notificações conectado com sucesso"

5. Clique no **sino** no canto superior direito
6. **Deve aparecer:** A notificação de teste criada no Passo 6

### PASSO 8: Teste Real - Criar Agendamento

1. Abra uma aba anônima: `http://localhost:5173/agendar`
2. Faça um agendamento completo
3. Volte para a aba do admin
4. **Deve aparecer:** Notificação "🎉 Novo Agendamento" no sino

---

## 🔍 TROUBLESHOOTING

### Problema: "CHANNEL_ERROR" ainda aparece

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche e abra o navegador
3. Verifique se Realtime está habilitado no Supabase
4. Aguarde 1-2 minutos após habilitar Realtime

### Problema: Notificações não aparecem mesmo com "SUBSCRIBED"

**Verificar:**
```sql
-- Ver se há notificações no banco
SELECT COUNT(*) as total
FROM admin_notifications
WHERE salon_id = '31a1af0c-3549-4250-ae27-03a46e3dce5a';

-- Ver últimas notificações
SELECT *
FROM admin_notifications
WHERE salon_id = '31a1af0c-3549-4250-ae27-03a46e3dce5a'
ORDER BY created_at DESC
LIMIT 5;
```

**Se COUNT = 0:**
- Triggers não estão funcionando
- Execute a migration completa novamente

**Se COUNT > 0 mas não aparecem no frontend:**
- Problema de RLS
- Verifique se está logado com o usuário correto
- Verifique se o `owner_id` do salão corresponde ao `auth.uid()`

### Problema: Erro 401 ao buscar notificações

**Solução:**
```sql
-- Verificar owner_id do salão
SELECT
    s.id,
    s.name,
    s.owner_id,
    u.email
FROM salons s
LEFT JOIN auth.users u ON u.id = s.owner_id
WHERE s.id = '31a1af0c-3549-4250-ae27-03a46e3dce5a';

-- Se owner_id estiver NULL, atualizar:
UPDATE salons
SET owner_id = (SELECT id FROM auth.users LIMIT 1)
WHERE id = '31a1af0c-3549-4250-ae27-03a46e3dce5a';
```

---

## 📊 VERIFICAÇÃO FINAL

Execute este SQL para ver o status completo:

```sql
-- Status completo do sistema de notificações
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
    ) >= 3 THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '4. Triggers criados',
    CASE WHEN (
        SELECT COUNT(*)
        FROM information_schema.triggers
        WHERE event_object_table = 'appointments'
          AND trigger_name LIKE '%notify_admin%'
    ) >= 3 THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '5. Notificações existem',
    CASE WHEN (
        SELECT COUNT(*)
        FROM admin_notifications
    ) > 0 THEN '✅ SIM' ELSE '⚠️ VAZIO' END;
```

**Resultado esperado:**
```
1. Tabela existe        ✅ SIM
2. RLS habilitado       ✅ SIM
3. Políticas criadas    ✅ SIM
4. Triggers criados     ✅ SIM
5. Notificações existem ✅ SIM (ou ⚠️ VAZIO se ainda não criou agendamentos)
```

---

## 🎯 CHECKLIST RÁPIDO

- [ ] Realtime habilitado em `admin_notifications` no Supabase Dashboard
- [ ] RLS habilitado na tabela
- [ ] 4 políticas RLS criadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] 3 triggers criados (new, cancelled, rescheduled)
- [ ] Notificação de teste criada e aparece no banco
- [ ] Console mostra "SUBSCRIBED" ao invés de "CHANNEL_ERROR"
- [ ] Sino mostra a notificação de teste
- [ ] Criar agendamento real gera notificação

---

## 📞 PRÓXIMOS PASSOS

Após corrigir:

1. **Testar cancelamento:**
   - Cancele um agendamento
   - Deve aparecer: "❌ Agendamento Cancelado"

2. **Testar reagendamento:**
   - Reagende um agendamento
   - Deve aparecer: "🔄 Agendamento Reagendado"

3. **Marcar como lida:**
   - Clique na notificação
   - Badge de contador deve diminuir

4. **Limpar notificações:**
   - Clique em "Limpar Tudo"
   - Todas devem ser marcadas como lidas

---

**Execute o PASSO 1 e PASSO 2 AGORA e me informe o resultado!**
