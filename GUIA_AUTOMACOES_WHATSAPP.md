# 🤖 AUTOMAÇÕES DE WHATSAPP - GUIA COMPLETO

**Data:** 2026-02-18 18:48
**Status:** ✅ IMPLEMENTADO - AGUARDANDO DEPLOY

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### 1. ✅ Confirmação Automática de Agendamento
Quando um cliente faz um agendamento pela página pública, o sistema **automaticamente** envia uma mensagem de confirmação via WhatsApp com:
- Nome do cliente
- Data e horário do agendamento
- Serviço contratado
- Profissional selecionado
- Valor total
- **Chave PIX do salão** (se cadastrada)
- Instruções importantes

### 2. ✅ Mensagens de Aniversário Automáticas
Sistema executa **diariamente** (via cron job) e envia mensagens de parabéns para clientes aniversariantes com:
- 5 templates diferentes (aleatório)
- Desconto especial de aniversário (configurável)
- Mensagem personalizada com nome do cliente
- Convite para visitar o salão

### 3. ✅ Sistema de Logs Completo
Todas as mensagens enviadas são registradas em `whatsapp_logs` com:
- Status (pending, sent, failed)
- Tipo de mensagem
- Conteúdo enviado
- Erros (se houver)
- Data/hora de envio

---

## 📁 ARQUIVOS CRIADOS

### Edge Functions (Supabase)

#### 1. `auto-appointment-confirmation/index.ts`
**Localização:** `supabase/functions/auto-appointment-confirmation/`

**Função:** Envia confirmação automática de agendamento

**Como funciona:**
1. Recebe dados do agendamento
2. Busca informações do salão (nome, PIX, instância WhatsApp)
3. Gera mensagem personalizada
4. Envia via Evolution API
5. Registra log no banco

**Trigger:** Chamado automaticamente quando um novo agendamento é criado

#### 2. `auto-birthday-messages/index.ts`
**Localização:** `supabase/functions/auto-birthday-messages/`

**Função:** Envia mensagens de aniversário

**Como funciona:**
1. Busca todos os salões ativos com WhatsApp
2. Para cada salão, busca clientes aniversariantes do dia
3. Escolhe template aleatório
4. Envia mensagem personalizada
5. Registra log no banco

**Trigger:** Deve ser executado via cron job diariamente (ex: 9h da manhã)

**Templates disponíveis:**
1. **Clássico Elegante** - Formal e sofisticado
2. **Moderno e Descontraído** - Jovem e animado
3. **Luxo e Sofisticação** - Premium e exclusivo
4. **Carinhoso e Acolhedor** - Caloroso e pessoal
5. **Motivacional e Inspirador** - Energético e positivo

### SQL Script

#### `AUTOMACOES_WHATSAPP.sql`
**Localização:** Raiz do projeto

**Cria:**
- ✅ Tabela `whatsapp_logs` - Logs de todas as mensagens
- ✅ Tabela `message_templates` - Templates personalizados
- ✅ Colunas em `salons`:
  - `whatsapp_instance_name` - Nome da instância Evolution
  - `auto_confirm_appointments` - Ativar/desativar confirmação automática
  - `auto_birthday_messages` - Ativar/desativar mensagens de aniversário
  - `birthday_discount_percent` - Percentual de desconto de aniversário
- ✅ Coluna `birth_date` em `clients` - Data de nascimento
- ✅ Trigger `on_appointment_created` - Dispara confirmação automática
- ✅ View `whatsapp_stats` - Estatísticas de envio
- ✅ Função `get_birthday_clients()` - Busca aniversariantes
- ✅ RLS (Row Level Security) configurado

### Integração Frontend

#### `src/pages/PublicSalon.tsx`
**Modificações:**
- ✅ Salva `birth_date` do cliente no formato correto (YYYY-MM-DD)
- ✅ Chama Edge Function de confirmação após criar agendamento
- ✅ Envia todos os dados necessários (nome, telefone, serviço, profissional, etc.)
- ✅ Não bloqueia agendamento se WhatsApp falhar

---

## 🚀 COMO FAZER O DEPLOY

### 1. Executar SQL no Supabase

```bash
# Acesse o SQL Editor do Supabase
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

# Copie e cole o conteúdo de AUTOMACOES_WHATSAPP.sql
# Clique em RUN
# Aguarde: "✅ TODAS AS AUTOMAÇÕES DE WHATSAPP CONFIGURADAS COM SUCESSO!"
```

### 2. Deploy das Edge Functions

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Link com o projeto
supabase link --project-ref jfjbpjnnfnuiezchhust

# Deploy da função de confirmação
supabase functions deploy auto-appointment-confirmation

# Deploy da função de aniversário
supabase functions deploy auto-birthday-messages
```

### 3. Configurar Variáveis de Ambiente no Supabase

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions

Adicione as variáveis:
```
EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br
EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5
```

### 4. Configurar Cron Job para Aniversários

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/database/cron-jobs

Crie um novo cron job:
```sql
-- Nome: Birthday Messages Daily
-- Schedule: 0 9 * * * (Todos os dias às 9h)
-- Command:
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
);
```

### 5. Configurar Salão

Para cada salão, configure no admin:

1. Acesse Configurações do Salão
2. Preencha:
   - **WhatsApp Instance Name** - Nome da instância Evolution (ex: "salao123")
   - **Auto Confirm Appointments** - ✅ Ativado
   - **Auto Birthday Messages** - ✅ Ativado
   - **Birthday Discount Percent** - 10% (ou outro valor)
   - **Chave PIX** - Sua chave PIX

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### Tabela: `whatsapp_logs`
```sql
id                  UUID PRIMARY KEY
salon_id            UUID (FK -> salons)
appointment_id      UUID (FK -> appointments) [nullable]
client_id           UUID (FK -> clients) [nullable]
recipient_phone     TEXT
recipient_name      TEXT
message_type        TEXT (appointment_confirmation, birthday, reminder, custom)
message_content     TEXT
status              TEXT (pending, sent, failed)
error_message       TEXT [nullable]
whatsapp_message_id TEXT [nullable]
sent_at             TIMESTAMPTZ [nullable]
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

### Tabela: `message_templates`
```sql
id          UUID PRIMARY KEY
salon_id    UUID (FK -> salons)
name        TEXT
type        TEXT (appointment_confirmation, birthday, reminder, custom)
content     TEXT
variables   JSONB
is_active   BOOLEAN
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

### Novas Colunas em `salons`
```sql
whatsapp_instance_name      TEXT
auto_confirm_appointments   BOOLEAN (default: true)
auto_birthday_messages      BOOLEAN (default: true)
birthday_discount_percent   INTEGER (default: 10)
```

### Nova Coluna em `clients`
```sql
birth_date  DATE
```

---

## 🧪 COMO TESTAR

### Teste 1: Confirmação de Agendamento

1. Acesse a página pública do salão
2. Faça um agendamento completo
3. Preencha nome, telefone, data de nascimento
4. Confirme o agendamento
5. **Resultado esperado:**
   - Agendamento criado com sucesso
   - WhatsApp enviado automaticamente para o cliente
   - Log registrado em `whatsapp_logs`

### Teste 2: Mensagem de Aniversário

**Opção A - Teste Manual:**
```sql
-- Execute no SQL Editor do Supabase
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
);
```

**Opção B - Criar Cliente Aniversariante:**
1. Crie um cliente com `birth_date` = hoje
2. Aguarde o cron job executar (9h da manhã)
3. Ou execute manualmente via SQL acima

### Teste 3: Verificar Logs

```sql
-- Ver últimas mensagens enviadas
SELECT * FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 10;

-- Ver estatísticas
SELECT * FROM whatsapp_stats
WHERE salon_id = 'SEU_SALON_ID';

-- Ver aniversariantes de hoje
SELECT * FROM get_birthday_clients('SEU_SALON_ID');
```

---

## 🔧 TROUBLESHOOTING

### Problema: Mensagem não foi enviada

**Verificar:**
1. ✅ Salão tem `whatsapp_instance_name` configurado?
2. ✅ Instância Evolution está conectada?
3. ✅ Telefone do cliente está no formato correto?
4. ✅ Edge Function foi deployada?
5. ✅ Variáveis de ambiente configuradas?

**Consultar logs:**
```sql
SELECT * FROM whatsapp_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Problema: Trigger não está funcionando

**Verificar:**
```sql
-- Ver se trigger existe
SELECT * FROM pg_trigger
WHERE tgname = 'on_appointment_created';

-- Ver se função existe
SELECT * FROM pg_proc
WHERE proname = 'trigger_appointment_confirmation';
```

### Problema: Cron job não executa

**Verificar:**
1. Cron job foi criado no Supabase?
2. Horário está correto? (UTC)
3. Service role key está configurada?

---

## 📈 ESTATÍSTICAS E MONITORAMENTO

### View: `whatsapp_stats`
Mostra estatísticas agregadas por salão, tipo e status:
- Total de mensagens
- Últimas 24 horas
- Últimos 7 dias
- Últimos 30 dias

### Consultas Úteis

```sql
-- Taxa de sucesso por salão
SELECT
    salon_id,
    message_type,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*) * 100, 2) as success_rate
FROM whatsapp_logs
GROUP BY salon_id, message_type;

-- Mensagens enviadas hoje
SELECT COUNT(*) FROM whatsapp_logs
WHERE sent_at >= CURRENT_DATE;

-- Aniversariantes do mês
SELECT COUNT(*) FROM clients
WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE);
```

---

## 🎨 PERSONALIZAÇÃO

### Criar Templates Personalizados

```sql
INSERT INTO message_templates (salon_id, name, type, content, variables, is_active)
VALUES (
    'SEU_SALON_ID',
    'Meu Template Personalizado',
    'appointment_confirmation',
    'Olá {client_name}! Seu agendamento em {salon_name} foi confirmado para {date} às {time}.',
    '{"client_name": "Nome do cliente", "salon_name": "Nome do salão", "date": "Data", "time": "Horário"}'::jsonb,
    true
);
```

### Variáveis Disponíveis

**Confirmação de Agendamento:**
- `{client_name}` - Nome do cliente
- `{salon_name}` - Nome do salão
- `{date}` - Data do agendamento
- `{time}` - Horário
- `{service}` - Nome do serviço
- `{professional}` - Nome do profissional
- `{price}` - Valor total
- `{pix_key}` - Chave PIX

**Aniversário:**
- `{client_name}` - Nome do cliente
- `{salon_name}` - Nome do salão
- `{discount}` - Percentual de desconto

---

## ✅ CHECKLIST DE DEPLOY

- [ ] SQL executado no Supabase
- [ ] Edge Function `auto-appointment-confirmation` deployada
- [ ] Edge Function `auto-birthday-messages` deployada
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job criado
- [ ] Salão configurado (instance name, PIX, etc.)
- [ ] Teste de confirmação realizado
- [ ] Teste de aniversário realizado
- [ ] Logs verificados

---

## 📞 SUPORTE

**Problemas com Evolution API:**
- URL: https://api.tubaraoemprestimo.com.br
- Documentação: https://doc.evolution-api.com

**Problemas com Supabase:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs

---

**Última Atualização:** 2026-02-18 18:48
**Status:** ✅ PRONTO PARA DEPLOY
**Desenvolvido por:** Claude Opus 4.6
