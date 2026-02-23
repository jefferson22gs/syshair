# 🔍 DEBUG - Notificações e WhatsApp

**Data:** 23/02/2026 às 12:13
**Problemas reportados:**
1. ❌ Notificações não aparecem no sino
2. ❌ WhatsApp não está sendo enviado após agendamento

---

## 🔧 PASSO 1: Verificar Notificações

### 1.1 Verificar se a tabela existe no Supabase

Acesse: **Supabase Dashboard → SQL Editor**

Execute:
```sql
-- Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'admin_notifications'
);

-- Contar notificações
SELECT COUNT(*) as total_notifications FROM admin_notifications;

-- Ver últimas notificações
SELECT * FROM admin_notifications
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- Tabela existe: `true`
- Total de notificações: número > 0
- Últimas notificações: lista com dados

### 1.2 Verificar triggers

```sql
-- Verificar se os triggers existem
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;
```

**Resultado esperado:**
- `trigger_notify_admin_new_appointment` - INSERT
- `trigger_notify_admin_cancelled` - UPDATE
- `trigger_notify_admin_rescheduled` - UPDATE

### 1.3 Testar trigger manualmente

```sql
-- Criar um agendamento de teste
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
    'Cliente Teste' as client_name,
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
ORDER BY created_at DESC
LIMIT 1;
```

### 1.4 Verificar RLS (Row Level Security)

```sql
-- Ver políticas da tabela admin_notifications
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'admin_notifications';
```

**Se não houver políticas, criar:**

```sql
-- Permitir SELECT para donos do salão
CREATE POLICY "Salon owners can view their notifications"
ON admin_notifications
FOR SELECT
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

-- Permitir INSERT para sistema (triggers)
CREATE POLICY "System can insert notifications"
ON admin_notifications
FOR INSERT
WITH CHECK (true);

-- Permitir UPDATE para donos do salão
CREATE POLICY "Salon owners can update their notifications"
ON admin_notifications
FOR UPDATE
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);
```

---

## 📱 PASSO 2: Verificar WhatsApp

### 2.1 Verificar no Console do Navegador

1. Abra o navegador (F12)
2. Vá para a aba **Console**
3. Crie um agendamento
4. Procure por:
   - ✅ "WhatsApp enviado com sucesso"
   - ❌ "Erro ao enviar WhatsApp"

### 2.2 Testar Evolution API manualmente

Abra o **Terminal** ou **Postman** e execute:

```bash
curl -X POST "https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7" \
  -H "Content-Type: application/json" \
  -H "apikey: B8959800-F546-407C-99E8-C40306E747F5" \
  -d '{
    "number": "5511999999999",
    "text": "Teste de mensagem do SysHair"
  }'
```

**Resultado esperado:**
- Status 200 ou 201
- Mensagem recebida no WhatsApp

**Se der erro:**
- 401: API key inválida
- 403: Instância não autorizada
- 404: Instância não encontrada
- 500: Erro no servidor

### 2.3 Verificar instância WhatsApp

```bash
curl -X GET "https://api.tubaraoemprestimo.com.br/instance/connectionState/syshair_daniel_cabelos_1777c2a7" \
  -H "apikey: B8959800-F546-407C-99E8-C40306E747F5"
```

**Resultado esperado:**
```json
{
  "instance": "syshair_daniel_cabelos_1777c2a7",
  "state": "open"
}
```

**Se state != "open":**
- Instância desconectada
- Precisa reconectar via QR Code

### 2.4 Verificar código no PublicBookingAdvanced.tsx

Abra o arquivo e verifique se o código está assim:

```typescript
// Linha ~240-270
try {
  const whatsappMessage = `...`;

  await fetch('https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
    },
    body: JSON.stringify({
      number: clientPhone.trim().replace(/\D/g, ''),
      text: whatsappMessage
    })
  });

  console.log('WhatsApp enviado com sucesso');
} catch (whatsappError) {
  console.error('Erro ao enviar WhatsApp:', whatsappError);
}
```

### 2.5 Adicionar logs detalhados

Modifique temporariamente o código para ver mais detalhes:

```typescript
try {
  const phoneNumber = clientPhone.trim().replace(/\D/g, '');
  console.log('📱 Enviando WhatsApp para:', phoneNumber);
  console.log('📝 Mensagem:', whatsappMessage);

  const response = await fetch('https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
    },
    body: JSON.stringify({
      number: phoneNumber,
      text: whatsappMessage
    })
  });

  console.log('📊 Status da resposta:', response.status);
  const responseData = await response.json();
  console.log('📦 Resposta completa:', responseData);

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${JSON.stringify(responseData)}`);
  }

  console.log('✅ WhatsApp enviado com sucesso');
} catch (whatsappError) {
  console.error('❌ Erro ao enviar WhatsApp:', whatsappError);
}
```

---

## 🧪 PASSO 3: Teste Completo

### Teste 1: Criar agendamento e verificar tudo

1. Abra o console do navegador (F12)
2. Acesse a página de agendamento
3. Preencha os dados:
   - Nome: "Teste Debug"
   - Telefone: "11999999999" (seu número real)
4. Confirme o agendamento
5. Verifique:
   - ✅ Console mostra "WhatsApp enviado"
   - ✅ Recebeu WhatsApp
   - ✅ Notificação aparece no sino

### Teste 2: Verificar notificação no banco

```sql
-- Ver última notificação criada
SELECT
    n.*,
    s.name as salon_name,
    a.client_name,
    a.client_phone
FROM admin_notifications n
LEFT JOIN salons s ON s.id = n.salon_id
LEFT JOIN appointments a ON a.id = n.appointment_id
ORDER BY n.created_at DESC
LIMIT 1;
```

---

## 🔍 DIAGNÓSTICO RÁPIDO

### Problema: Notificações não aparecem

**Possíveis causas:**
1. ❌ Tabela não existe → Executar migration
2. ❌ Triggers não existem → Executar migration
3. ❌ RLS bloqueando → Criar políticas
4. ❌ salon_id incorreto → Verificar query
5. ❌ Realtime não conectado → Verificar Supabase

### Problema: WhatsApp não envia

**Possíveis causas:**
1. ❌ Evolution API offline → Testar curl
2. ❌ Instância desconectada → Reconectar QR Code
3. ❌ API key inválida → Verificar credenciais
4. ❌ Número inválido → Verificar formato (55119...)
5. ❌ Código não executando → Verificar console
6. ❌ CORS bloqueando → Verificar network tab

---

## 📝 CHECKLIST DE VERIFICAÇÃO

- [ ] Tabela `admin_notifications` existe
- [ ] Triggers estão criados
- [ ] RLS configurado corretamente
- [ ] Notificações aparecem no banco após criar agendamento
- [ ] Evolution API responde ao curl
- [ ] Instância WhatsApp está conectada (state: "open")
- [ ] Console mostra logs de envio
- [ ] Número de telefone está no formato correto (5511999999999)
- [ ] Mensagem está sendo formatada corretamente
- [ ] Response da API é 200/201

---

## 🚨 SOLUÇÃO RÁPIDA

Se nada funcionar, execute no Supabase SQL Editor:

```sql
-- 1. Recriar tabela e triggers
DROP TABLE IF EXISTS admin_notifications CASCADE;

-- 2. Executar migration completa novamente
-- Copie e cole o conteúdo de:
-- supabase/migrations/20260223_admin_notifications_system_fixed.sql

-- 3. Criar políticas RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can view their notifications"
ON admin_notifications FOR SELECT
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

CREATE POLICY "System can insert notifications"
ON admin_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Salon owners can update their notifications"
ON admin_notifications FOR UPDATE
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

-- 4. Testar criando agendamento
-- Depois verificar:
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 5;
```

---

**Execute estes passos e me informe o resultado de cada um!**
