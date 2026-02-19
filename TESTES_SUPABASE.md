# 🧪 TESTE DAS EDGE FUNCTIONS - EXECUTAR NO SUPABASE

**Execute estes comandos no SQL Editor do Supabase para testar as functions**

---

## 📍 Acessar SQL Editor

```
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
```

---

## 🧪 TESTE 1: Verificar se as Functions existem

Execute este comando primeiro:

```sql
-- Ver se as functions estão deployadas
SELECT
    'auto-appointment-confirmation' as function_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'http'
        ) THEN '✅ Extension HTTP instalada'
        ELSE '❌ Extension HTTP não instalada'
    END as status;
```

---

## 🧪 TESTE 2: Testar Function de Confirmação

**IMPORTANTE:** Substitua `SEU_SALON_ID` pelo ID real do seu salão.

Para pegar o ID do salão, execute primeiro:
```sql
SELECT id, name FROM salons LIMIT 1;
```

Depois, teste a function:

```sql
-- Testar auto-appointment-confirmation
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-appointment-confirmation',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
        'id', 'test-' || gen_random_uuid()::text,
        'salon_id', 'SEU_SALON_ID_AQUI',
        'client_name', 'Teste Cliente',
        'client_phone', '11999999999',
        'service_name', 'Corte de Cabelo',
        'professional_name', 'João Silva',
        'appointment_date', '2026-02-20',
        'appointment_time', '14:00',
        'total_price', 50,
        'status', 'pending'
    )
);
```

**Resultado esperado:**
- Se funcionar: `{"success": true, "message": "Confirmação enviada via WhatsApp"}`
- Se salão não tiver WhatsApp: `{"success": false, "message": "WhatsApp não configurado"}`

---

## 🧪 TESTE 3: Testar Function de Aniversário

```sql
-- Testar auto-birthday-messages
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
);
```

**Resultado esperado:**
- `{"success": true, "sent": 0, "failed": 0, "message": "Birthday messages processed: 0 sent, 0 failed"}`
- (0 enviados porque provavelmente não tem aniversariantes hoje)

---

## 🧪 TESTE 4: Criar Cliente Aniversariante e Testar

### 4.1 Criar cliente com aniversário hoje:

```sql
-- Pegar ID do salão
SELECT id FROM salons LIMIT 1;

-- Criar cliente aniversariante (substitua SEU_SALON_ID)
INSERT INTO clients (salon_id, name, phone, birth_date)
VALUES (
    'SEU_SALON_ID_AQUI',
    'Teste Aniversário',
    '11999999999',
    CURRENT_DATE
)
RETURNING id, name, birth_date;
```

### 4.2 Executar function de aniversário:

```sql
-- Executar function
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
);
```

**Resultado esperado:**
- `{"success": true, "sent": 1, "failed": 0, "message": "Birthday messages processed: 1 sent, 0 failed"}`

### 4.3 Verificar log:

```sql
-- Ver se o log foi criado
SELECT
    message_type,
    recipient_name,
    status,
    LEFT(message_content, 100) as preview,
    created_at
FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 TESTE 5: Ver Logs das Functions

### Ver logs de confirmação:
```sql
SELECT
    recipient_name,
    recipient_phone,
    status,
    error_message,
    created_at
FROM whatsapp_logs
WHERE message_type = 'appointment_confirmation'
ORDER BY created_at DESC
LIMIT 10;
```

### Ver logs de aniversário:
```sql
SELECT
    recipient_name,
    recipient_phone,
    status,
    error_message,
    created_at
FROM whatsapp_logs
WHERE message_type = 'birthday'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 TESTE 6: Estatísticas

```sql
-- Ver estatísticas gerais
SELECT
    message_type,
    status,
    COUNT(*) as total,
    MAX(created_at) as ultima_mensagem
FROM whatsapp_logs
GROUP BY message_type, status
ORDER BY message_type, status;
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Execute os testes na ordem e marque:

- [ ] TESTE 1: Extension HTTP instalada
- [ ] TESTE 2: Function de confirmação responde
- [ ] TESTE 3: Function de aniversário responde
- [ ] TESTE 4: Cliente aniversariante criado
- [ ] TESTE 4: Mensagem de aniversário enviada
- [ ] TESTE 5: Logs aparecem no banco
- [ ] TESTE 6: Estatísticas funcionam

---

## 🔍 VERIFICAR LOGS DAS FUNCTIONS

Se algo não funcionar, veja os logs detalhados:

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
2. Clique em `auto-appointment-confirmation`
3. Aba "Logs"
4. Procure por erros em vermelho

Faça o mesmo para `auto-birthday-messages`

---

## ❌ POSSÍVEIS ERROS

### "Salon not found"
- O `salon_id` está errado
- Use o comando para pegar o ID correto

### "WhatsApp não configurado"
- O salão não tem `whatsapp_instance_name`
- Configure em: https://syshair.vercel.app/admin/settings

### "Invalid phone number format"
- O telefone está em formato inválido
- Use formato: `11999999999` (sem espaços ou caracteres)

### "Evolution API error"
- A instância Evolution não está conectada
- Ou o nome da instância está errado
- Verifique em: https://api.tubaraoemprestimo.com.br

---

## 🎯 RESULTADO ESPERADO

Se tudo estiver funcionando:

✅ **TESTE 2:** Retorna success ou "WhatsApp não configurado"
✅ **TESTE 3:** Retorna success com 0 ou mais mensagens enviadas
✅ **TESTE 4:** Cria cliente e envia mensagem
✅ **TESTE 5:** Logs aparecem no banco
✅ **TESTE 6:** Estatísticas mostram os envios

---

**Execute estes testes e me diga os resultados!**

Se algum teste falhar, copie a mensagem de erro e eu te ajudo a corrigir.
