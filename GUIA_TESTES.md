# 🧪 TESTE DAS AUTOMAÇÕES - GUIA RÁPIDO

**Data:** 2026-02-18 19:06
**Status:** Edge Functions deployadas - Hora de testar!

---

## ✅ VERIFICAÇÃO RÁPIDA

### 1. Verificar se as Functions estão ativas

Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions

Você deve ver:
- ✅ **auto-appointment-confirmation** (status: deployed)
- ✅ **auto-birthday-messages** (status: deployed)

---

## 🧪 TESTE 1: Confirmação de Agendamento

### Passo a Passo:

1. **Configurar o Salão primeiro:**
   - Acesse: https://syshair.vercel.app/admin/settings
   - Preencha:
     - **WhatsApp Instance Name:** (nome da sua instância Evolution)
     - **Chave PIX:** Sua chave PIX
   - Salve

2. **Fazer um Agendamento:**
   - Acesse a página pública do salão
   - Selecione um serviço
   - Preencha:
     - Nome: Seu nome
     - Telefone: **SEU NÚMERO** (para receber o WhatsApp)
     - Data de nascimento
   - Selecione data e horário
   - Confirme o agendamento

3. **Verificar:**
   - ✅ Agendamento criado com sucesso?
   - ✅ WhatsApp recebido no seu telefone?
   - ✅ Mensagem contém: nome, data, horário, serviço, PIX?

---

## 🧪 TESTE 2: Ver Logs da Function

### Ver se a function foi chamada:

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
2. Clique em **auto-appointment-confirmation**
3. Vá na aba **"Logs"**
4. Você deve ver:
   ```
   Processing appointment confirmation: [ID]
   WhatsApp sent successfully: {...}
   ```

---

## 🧪 TESTE 3: Verificar Banco de Dados

### Ver se o log foi registrado:

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/editor
2. Execute:
   ```sql
   SELECT * FROM whatsapp_logs
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. Você deve ver o registro com:
   - `message_type`: "appointment_confirmation"
   - `status`: "sent"
   - `recipient_phone`: Seu telefone
   - `message_content`: A mensagem completa

---

## 🧪 TESTE 4: Mensagens de Aniversário (Manual)

### Testar a function de aniversário:

1. **Criar um cliente aniversariante:**
   ```sql
   -- Execute no SQL Editor
   INSERT INTO clients (salon_id, name, phone, birth_date)
   VALUES (
       'SEU_SALON_ID',
       'Teste Aniversário',
       '11999999999',
       CURRENT_DATE  -- Aniversário hoje!
   );
   ```

2. **Executar a function manualmente:**
   ```sql
   SELECT net.http_post(
       url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
       headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
       ),
       body := '{}'::jsonb
   );
   ```

3. **Verificar:**
   - ✅ WhatsApp recebido?
   - ✅ Mensagem de parabéns com desconto?
   - ✅ Log registrado em `whatsapp_logs`?

---

## 🧪 TESTE 5: Notificações em Tempo Real

### Testar se as notificações aparecem no admin:

1. **Abrir o Admin:**
   - Acesse: https://syshair.vercel.app/admin
   - Faça login

2. **Verificar indicador:**
   - No header, deve aparecer: **"Tempo Real"** com bolinha verde pulsando
   - Isso indica que o WebSocket está conectado

3. **Fazer um agendamento:**
   - Em outra aba/dispositivo, faça um agendamento público
   - No admin, deve aparecer:
     - 🔔 Toast notification: "🎉 Novo Agendamento!"
     - Badge vermelho no sino
     - Notificação na lista ao clicar no sino

---

## ❌ TROUBLESHOOTING

### WhatsApp não foi enviado?

**Verificar:**
1. ✅ Salão tem `whatsapp_instance_name` configurado?
   ```sql
   SELECT id, name, whatsapp_instance_name
   FROM salons
   WHERE owner_id = auth.uid();
   ```

2. ✅ Instância Evolution está conectada?
   - Teste manualmente: https://api.tubaraoemprestimo.com.br

3. ✅ Secrets configurados?
   - Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions
   - Verifique se `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão lá

4. ✅ Ver logs de erro:
   ```sql
   SELECT * FROM whatsapp_logs
   WHERE status = 'failed'
   ORDER BY created_at DESC;
   ```

### Function retorna erro?

**Ver logs detalhados:**
1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
2. Clique na function
3. Aba "Logs"
4. Procure por mensagens de erro em vermelho

### Notificações não aparecem?

**Verificar:**
1. ✅ Indicador "Tempo Real" está verde?
2. ✅ Console do navegador tem erros? (F12)
3. ✅ Supabase Realtime está ativo?
   - Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/api
   - Verifique se "Realtime" está habilitado

---

## 📊 CONSULTAS ÚTEIS

### Ver todos os logs de WhatsApp:
```sql
SELECT
    message_type,
    status,
    recipient_name,
    recipient_phone,
    created_at
FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Ver estatísticas:
```sql
SELECT
    message_type,
    status,
    COUNT(*) as total
FROM whatsapp_logs
GROUP BY message_type, status;
```

### Ver aniversariantes de hoje:
```sql
SELECT * FROM clients
WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
```

### Ver próximos aniversariantes (próximos 7 dias):
```sql
SELECT
    name,
    phone,
    birth_date,
    EXTRACT(DAY FROM birth_date) as dia,
    EXTRACT(MONTH FROM birth_date) as mes
FROM clients
WHERE birth_date IS NOT NULL
ORDER BY
    EXTRACT(MONTH FROM birth_date),
    EXTRACT(DAY FROM birth_date)
LIMIT 10;
```

---

## ✅ TUDO FUNCIONANDO?

Se todos os testes passaram:
- ✅ WhatsApp de confirmação enviado
- ✅ Logs registrados no banco
- ✅ Notificações em tempo real funcionando
- ✅ Cron job configurado

**PARABÉNS! 🎉**

Seu sistema está 100% funcional com:
- 🤖 Confirmação automática de agendamento
- 🎂 Mensagens de aniversário diárias
- 🔔 Notificações em tempo real
- 📊 Sistema completo de logs
- 💳 PIX integrado

---

**Última Atualização:** 2026-02-18 19:06
**Status:** Pronto para testes
