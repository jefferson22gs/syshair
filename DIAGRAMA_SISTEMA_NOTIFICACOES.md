# 📊 DIAGRAMA DO SISTEMA DE NOTIFICAÇÕES

**Data:** 23/02/2026 às 13:12
**Versão:** 1.0

---

## 🔄 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE FAZ AGENDAMENTO                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: PublicBookingAdvanced.tsx ou BookingFlow.tsx        │
│  - Valida dados do cliente                                      │
│  - Chama useSalon.createAppointment()                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hook: useSalon.tsx (linha 411-522)                            │
│  - Calcula end_time baseado na duração                         │
│  - INSERT na tabela appointments                                │
│  - Retorna appointment criado                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase: Tabela appointments                                  │
│  - Novo registro inserido                                       │
│  - Status: 'pending'                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Trigger SQL: trigger_notify_admin_new_appointment             │
│  - Dispara AFTER INSERT                                         │
│  - Executa função notify_admin_new_appointment()               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Função SQL: notify_admin_new_appointment()                    │
│  - Busca nome do serviço                                        │
│  - Busca nome do profissional                                   │
│  - Formata mensagem                                             │
│  - INSERT na tabela admin_notifications                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase: Tabela admin_notifications                          │
│  - Novo registro inserido                                       │
│  - type: 'new_appointment'                                      │
│  - read: false                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Realtime: Canal admin_notifications_{salon_id}      │
│  - Detecta INSERT na tabela                                     │
│  - Envia evento para clientes conectados                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: AdminNotificationCenter.tsx (linha 108-143)         │
│  - Recebe evento via subscribeToNotifications()                │
│  - Adiciona notificação ao estado                               │
│  - Incrementa unreadCount                                       │
│  - Mostra toast                                                 │
│  - Toca som (opcional)                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI: Sino 🔔 no AdminDashboard                                 │
│  - Badge atualiza com novo contador                             │
│  - Notificação aparece no dropdown                              │
│  - Admin vê em tempo real                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES DO SISTEMA

### 1. Tabela: `appointments`
```sql
appointments
├── id (UUID)
├── salon_id (UUID)
├── service_id (UUID)
├── professional_id (UUID)
├── client_name (TEXT)
├── client_phone (TEXT)
├── date (DATE)
├── start_time (TIME)
├── end_time (TIME)
├── status (TEXT) ← 'pending', 'confirmed', 'cancelled'
└── created_at (TIMESTAMPTZ)
```

### 2. Tabela: `admin_notifications`
```sql
admin_notifications
├── id (UUID)
├── salon_id (UUID)
├── appointment_id (UUID)
├── type (TEXT) ← 'new_appointment', 'cancelled_appointment', 'rescheduled_appointment'
├── title (TEXT)
├── message (TEXT)
├── client_name (TEXT)
├── client_phone (TEXT)
├── appointment_date (DATE)
├── appointment_time (TIME)
├── read (BOOLEAN) ← false = não lida
├── metadata (JSONB)
└── created_at (TIMESTAMPTZ)
```

### 3. Triggers SQL
```
trigger_notify_admin_new_appointment
├── Evento: AFTER INSERT ON appointments
├── Função: notify_admin_new_appointment()
└── Ação: Cria notificação de novo agendamento

trigger_notify_admin_cancelled
├── Evento: AFTER UPDATE ON appointments
├── Função: notify_admin_cancelled_appointment()
└── Ação: Cria notificação se status mudou para 'cancelled'

trigger_notify_admin_rescheduled
├── Evento: AFTER UPDATE ON appointments
├── Função: notify_admin_rescheduled_appointment()
└── Ação: Cria notificação se data/horário mudou
```

### 4. Políticas RLS
```
"Salon owners can view their notifications" (SELECT)
├── Permite: Donos do salão verem suas notificações
└── Condição: salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())

"System can insert notifications" (INSERT)
├── Permite: Sistema (triggers) inserir notificações
└── Condição: true (sem restrição)

"Salon owners can update their notifications" (UPDATE)
├── Permite: Donos do salão atualizarem suas notificações
└── Condição: salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())

"Salon owners can delete their notifications" (DELETE)
├── Permite: Donos do salão deletarem suas notificações
└── Condição: salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
```

### 5. Realtime Channel
```
Canal: admin_notifications_{salon_id}
├── Tipo: postgres_changes
├── Evento: INSERT
├── Schema: public
├── Tabela: admin_notifications
├── Filtro: salon_id=eq.{salon_id}
└── Status: SUBSCRIBED ← Deve estar assim!
```

---

## 🐛 PONTOS DE FALHA E SOLUÇÕES

### ❌ Problema 1: "CHANNEL_ERROR"
```
Causa: Realtime não habilitado na tabela
Solução: Database → Replication → admin_notifications [✓]
```

### ❌ Problema 2: Notificações não aparecem
```
Causa: RLS bloqueando SELECT
Solução: Verificar se owner_id do salão = auth.uid()
```

### ❌ Problema 3: Triggers não disparam
```
Causa: Triggers não foram criados
Solução: Executar FIX_NOTIFICATIONS_COMPLETE.sql
```

### ❌ Problema 4: Badge não atualiza
```
Causa: Frontend não está subscrito ao canal
Solução: Verificar console, deve mostrar "SUBSCRIBED"
```

---

## 🔍 LOGS DE DEBUG

### Console do Navegador (Frontend)
```javascript
// Início da subscrição
🔔 Iniciando notificações em tempo real para salon: 31a1af0c-...

// Status do canal
🔔 Status do canal de notificações: SUBSCRIBED ← ✅ BOM
🔔 Status do canal de notificações: CLOSED     ← ❌ RUIM
🔔 Status do canal de notificações: CHANNEL_ERROR ← ❌ RUIM

// Conexão bem-sucedida
🔔 Canal de notificações conectado com sucesso

// Nova notificação recebida
🔔 Nova notificação recebida: {id: "...", title: "🎉 Novo Agendamento", ...}
```

### SQL (Backend)
```sql
-- Ver notificações criadas
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 5;

-- Ver triggers ativos
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'appointments';

-- Ver políticas RLS
SELECT policyname FROM pg_policies
WHERE tablename = 'admin_notifications';
```

---

## 📈 MÉTRICAS DE SUCESSO

### ✅ Sistema Funcionando
```
✓ Console: "SUBSCRIBED"
✓ Badge: Número > 0
✓ Dropdown: Notificações visíveis
✓ Tempo real: < 1 segundo de latência
✓ Taxa de sucesso: 100%
```

### ❌ Sistema com Problema
```
✗ Console: "CHANNEL_ERROR" ou "CLOSED"
✗ Badge: Sempre 0
✗ Dropdown: Vazio
✗ Tempo real: Não atualiza
✗ Taxa de sucesso: 0%
```

---

## 🧪 TESTES AUTOMATIZADOS (Futuro)

### Teste 1: Criar Notificação
```sql
-- Inserir notificação de teste
INSERT INTO admin_notifications (salon_id, type, title, message)
VALUES ('31a1af0c-...', 'new_appointment', 'Teste', 'Mensagem de teste');

-- Verificar se foi criada
SELECT COUNT(*) FROM admin_notifications WHERE title = 'Teste';
-- Esperado: 1
```

### Teste 2: Trigger de Novo Agendamento
```sql
-- Criar agendamento de teste
INSERT INTO appointments (salon_id, service_id, professional_id, ...)
VALUES (...);

-- Verificar se notificação foi criada
SELECT COUNT(*) FROM admin_notifications
WHERE type = 'new_appointment'
AND created_at > NOW() - INTERVAL '1 minute';
-- Esperado: 1
```

### Teste 3: RLS
```sql
-- Tentar acessar notificações de outro salão
SET request.jwt.claims.sub = 'user-id-diferente';
SELECT * FROM admin_notifications WHERE salon_id = '31a1af0c-...';
-- Esperado: 0 linhas (bloqueado por RLS)
```

---

## 🔐 SEGURANÇA

### RLS (Row Level Security)
```
✓ Habilitado na tabela admin_notifications
✓ Apenas donos do salão veem suas notificações
✓ Sistema pode inserir (triggers)
✓ Clientes não têm acesso
```

### Realtime
```
✓ Filtrado por salon_id
✓ Apenas usuários autenticados
✓ Apenas notificações do próprio salão
```

---

## 📚 REFERÊNCIAS

### Arquivos do Projeto
```
src/components/admin/AdminNotificationCenter.tsx
├── Linha 108-143: subscribeToNotifications()
├── Linha 60-106: fetchNotifications()
└── Linha 145-151: playNotificationSound()

src/hooks/useSalon.tsx
├── Linha 411-522: createAppointment()
└── Linha 484-503: INSERT appointment

supabase/migrations/20260223_admin_notifications_system_fixed.sql
├── Linha 1-28: CREATE TABLE
├── Linha 30-75: RLS Policies
└── Linha 77-236: Triggers
```

### Documentação Supabase
- Realtime: https://supabase.com/docs/guides/realtime
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Triggers: https://supabase.com/docs/guides/database/postgres/triggers

---

## 🎯 RESUMO VISUAL

```
CLIENTE → AGENDAMENTO → APPOINTMENTS → TRIGGER → ADMIN_NOTIFICATIONS
                                                          ↓
                                                    REALTIME
                                                          ↓
                                                    FRONTEND
                                                          ↓
                                                      SINO 🔔
```

**Tempo total:** < 1 segundo do agendamento até aparecer no sino!

---

**Este diagrama ajuda a entender o fluxo completo do sistema.**

**Use como referência para debug e manutenção futura.**
