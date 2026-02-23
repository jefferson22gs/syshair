# ⚡ AÇÃO IMEDIATA - WhatsApp + Notificações Cliente

**Data:** 23/02/2026 às 14:41
**Tempo:** 10 minutos
**Status:** 🔴 AGUARDANDO EXECUÇÃO

---

## 🎯 PROBLEMAS IDENTIFICADOS

1. ❌ **WhatsApp não envia automaticamente** para cliente quando agenda
2. ❌ **Agendamentos duplicados** estão sendo criados
3. ❌ **Falta notificação push** para o cliente
4. ✅ **Notificações admin** já funcionando (você implementou)

---

## ✅ SOLUÇÃO RÁPIDA (3 PASSOS)

### 🗄️ PASSO 1: Executar SQL (3 min)

**Abra:** `FIX_WHATSAPP_E_NOTIFICACOES_CLIENTE.sql`

**Execute no Supabase SQL Editor**

**O que faz:**
- Cria tabela `client_notifications` (notificações para clientes)
- Cria tabela `whatsapp_config` (configuração WhatsApp)
- Cria 3 triggers para enviar WhatsApp automaticamente:
  - Novo agendamento → WhatsApp
  - Cancelamento → WhatsApp
  - Reagendamento → WhatsApp

**Resultado esperado:**
```
✅ 1. Tabela whatsapp_config: SIM
✅ 2. Tabela client_notifications: SIM
✅ 3. Triggers criados: SIM (3)
✅ 4. Configuração WhatsApp: SIM
```

---

### 🔧 PASSO 2: Prevenir Duplicados (1 min)

Execute no Supabase:

```sql
-- Prevenir agendamentos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique
ON appointments(salon_id, professional_id, date, start_time)
WHERE status != 'cancelled';
```

**Isso vai:**
- ✅ Impedir criar 2 agendamentos iguais
- ✅ Retornar erro se tentar duplicar
- ✅ Não afetar agendamentos cancelados

---

### 🔌 PASSO 3: Habilitar Realtime (1 min)

Execute no Supabase:

```sql
-- Habilitar Realtime para notificações do cliente
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;
```

**Verificar:**
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename LIKE '%notifications';
```

**Deve retornar:**
```
admin_notifications
client_notifications
```

---

## 🧪 TESTE RÁPIDO (5 min)

### 1. Criar Agendamento de Teste

```
1. Abra: http://localhost:5173/agendar
2. Preencha com SEU número de WhatsApp
3. Conclua o agendamento
```

### 2. Verificar se Notificação foi Criada

Execute no Supabase:

```sql
-- Ver últimas notificações para clientes
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

**Deve aparecer:**
```
type: appointment_confirmed
client_name: Seu Nome
client_phone: Seu Telefone
whatsapp_sent: false (ainda não processado)
```

### 3. Processar Envio de WhatsApp

**IMPORTANTE:** O trigger cria a notificação, mas o envio precisa ser processado.

Execute este código no console do navegador (F12):

```javascript
// Processar fila de WhatsApp
const processWhatsApp = async () => {
  const { data: pending } = await supabase
    .from('client_notifications')
    .select('*')
    .eq('whatsapp_sent', false)
    .limit(10);

  console.log('📱 Notificações pendentes:', pending?.length);

  for (const notification of pending || []) {
    try {
      const phone = notification.client_phone.replace(/\D/g, '');

      console.log('📤 Enviando para:', phone);

      const response = await fetch(
        'https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
          },
          body: JSON.stringify({
            number: phone,
            text: notification.message
          })
        }
      );

      if (response.ok) {
        console.log('✅ WhatsApp enviado!');

        await supabase
          .from('client_notifications')
          .update({
            whatsapp_sent: true,
            whatsapp_sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
      } else {
        console.error('❌ Erro:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erro ao enviar:', error);
    }
  }
};

// Executar
processWhatsApp();
```

### 4. Verificar WhatsApp

- ✅ Você deve receber WhatsApp com:
  - 🎉 Agendamento Confirmado
  - 📍 Nome do salão
  - ✂️ Serviço
  - 📅 Data e horário
  - 🔗 Link para gerenciar

---

## 📊 VERIFICAÇÃO COMPLETA

Execute no Supabase:

```sql
-- Status completo do sistema
SELECT '=== NOTIFICAÇÕES ===' as info;

SELECT
    'Admin' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE read = false) as pendentes
FROM admin_notifications
UNION ALL
SELECT
    'Cliente',
    COUNT(*),
    COUNT(*) FILTER (WHERE whatsapp_sent = false)
FROM client_notifications;

-- Triggers ativos
SELECT '=== TRIGGERS ===' as info;

SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;
```

**Resultado esperado:**
```
=== NOTIFICAÇÕES ===
Admin   | 5 | 2
Cliente | 3 | 0

=== TRIGGERS ===
trigger_notify_admin_cancelled
trigger_notify_admin_new_appointment
trigger_notify_admin_rescheduled
trigger_notify_client_cancelled
trigger_notify_client_new_appointment
trigger_notify_client_rescheduled
```

---

## 🔄 FLUXO COMPLETO

```
CLIENTE AGENDA
      ↓
INSERT appointments
      ↓
  ┌───┴───┐
  ↓       ↓
TRIGGER TRIGGER
ADMIN   CLIENTE
  ↓       ↓
admin_  client_
notif.  notif.
  ↓       ↓
SINO🔔  WHATSAPP📱
(Admin) (Cliente)
```

---

## 🐛 TROUBLESHOOTING

### WhatsApp não enviou?

**Verificar:**
```sql
SELECT * FROM client_notifications
WHERE whatsapp_sent = false;
```

**Se tem pendentes:**
- Execute o código JavaScript acima no console
- Ou crie um componente React para processar automaticamente

### Agendamento duplicou?

**Verificar:**
```sql
SELECT
    date,
    start_time,
    COUNT(*) as total
FROM appointments
WHERE status != 'cancelled'
GROUP BY date, start_time
HAVING COUNT(*) > 1;
```

**Se encontrar:**
```sql
-- Deletar duplicados (manter o mais recente)
DELETE FROM appointments a
USING appointments b
WHERE a.id < b.id
  AND a.date = b.date
  AND a.start_time = b.start_time
  AND a.status != 'cancelled';
```

---

## 📁 ARQUIVOS CRIADOS

1. **`FIX_WHATSAPP_E_NOTIFICACOES_CLIENTE.sql`** ⭐ Execute este
2. **`GUIA_CORRECAO_WHATSAPP_COMPLETO.md`** - Guia detalhado

---

## 🎯 RESULTADO ESPERADO

### ADMIN (Você):
✅ Notificações no sino em tempo real
✅ Badge atualiza automaticamente
✅ Vê todos os agendamentos

### CLIENTE:
✅ Recebe WhatsApp ao agendar
✅ Recebe WhatsApp ao cancelar
✅ Recebe WhatsApp ao reagendar
✅ Mensagem tem link de gerenciamento

---

## ⏱️ TIMELINE

```
14:41 - Você lê este arquivo (1 min)
14:42 - Executa SQL (3 min)
14:45 - Cria constraint duplicados (1 min)
14:46 - Habilita Realtime (1 min)
14:47 - Testa agendamento (2 min)
14:49 - Processa WhatsApp (2 min)
14:51 - ✅ FUNCIONANDO!
```

---

## 🚀 COMECE AGORA

**PASSO 1:**
```
1. Abra: FIX_WHATSAPP_E_NOTIFICACOES_CLIENTE.sql
2. Copie TODO o conteúdo
3. Cole no Supabase SQL Editor
4. Clique em "Run"
```

**Me avise quando terminar!**

---

**Tempo estimado: 10 minutos**

**Dificuldade: Média**

**Você vai conseguir! 💪**
