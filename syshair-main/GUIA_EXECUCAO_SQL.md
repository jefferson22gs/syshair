# 🚨 GUIA DE EXECUÇÃO URGENTE - SQL NO SUPABASE

## 📍 Acesse o SQL Editor
https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

---

## ⚠️ IMPORTANTE
- Execute **UM BLOCO POR VEZ**
- Se um bloco der erro "column already exists" ou "column does not exist", **PULE PARA O PRÓXIMO**
- Isso é normal se você já executou parte do script antes

---

## 📝 BLOCOS PARA EXECUTAR (copie e cole um por vez)

### BLOCO 1: Fix broadcast_templates
```sql
ALTER TABLE public.broadcast_templates
RENAME COLUMN message TO content;
```
✅ Se der erro "column message does not exist" = JÁ ESTÁ CORRETO, pule para o próximo

---

### BLOCO 2: Fix ai_provider_keys - Renomear key_value
```sql
ALTER TABLE public.ai_provider_keys
RENAME COLUMN key_value TO api_key;
```
✅ Se der erro "column key_value does not exist" = JÁ ESTÁ CORRETO, pule para o próximo

---

### BLOCO 3: Fix ai_provider_keys - Adicionar is_active
```sql
ALTER TABLE public.ai_provider_keys
ADD COLUMN is_active BOOLEAN DEFAULT true;
```
✅ Se der erro "column is_active already exists" = JÁ ESTÁ CORRETO, pule para o próximo

---

### BLOCO 4: Fix ai_provider_keys - Migrar dados
```sql
UPDATE public.ai_provider_keys
SET is_active = (status = 'active');
```
✅ Se der erro "column status does not exist" = JÁ ESTÁ CORRETO, pule para o próximo

---

### BLOCO 5: Fix ai_provider_keys - Remover status
```sql
ALTER TABLE public.ai_provider_keys
DROP COLUMN status;
```
✅ Se der erro "column status does not exist" = JÁ ESTÁ CORRETO, pule para o próximo

---

### BLOCO 6: Fix broadcast_messages - Adicionar colunas
```sql
ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
```
✅ Este sempre funciona (IF NOT EXISTS)

---

### BLOCO 7: Fix broadcast_messages - Renomear phone
```sql
ALTER TABLE public.broadcast_messages
RENAME COLUMN phone TO recipient_phone;
```
✅ Se der erro "column phone does not exist" = JÁ ESTÁ CORRETO

---

## 🔍 VERIFICAÇÃO FINAL

Execute este SELECT para confirmar:

```sql
SELECT
    'broadcast_templates' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'broadcast_templates'
AND column_name IN ('message', 'content')

UNION ALL

SELECT
    'ai_provider_keys' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ai_provider_keys'
AND column_name IN ('key_value', 'api_key', 'status', 'is_active')

UNION ALL

SELECT
    'broadcast_messages' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'broadcast_messages'
AND column_name IN ('phone', 'recipient_phone', 'recipient_name', 'sent_at')
ORDER BY tabela, column_name;
```

---

## ✅ RESULTADO ESPERADO

Você deve ver APENAS estas colunas (as antigas não devem aparecer):

| tabela | column_name | data_type |
|--------|-------------|-----------|
| ai_provider_keys | api_key | text |
| ai_provider_keys | is_active | boolean |
| broadcast_messages | recipient_name | character varying |
| broadcast_messages | recipient_phone | character varying |
| broadcast_messages | sent_at | timestamp with time zone |
| broadcast_templates | content | text |

---

## 🎯 APÓS EXECUTAR

1. ✅ Salvar templates funcionará
2. ✅ Melhorar com IA funcionará (se tiver chave de API configurada)
3. ✅ Disparar mensagens funcionará

---

## ⚙️ CONFIGURAR CHAVE DE IA (OPCIONAL)

Se quiser usar "Melhorar com IA", execute:

```sql
-- Inserir chave do Google Gemini (gratuita)
INSERT INTO public.ai_provider_keys (provider, api_key, is_active)
VALUES ('gemini', 'SUA_CHAVE_AQUI', true);

-- OU OpenAI
INSERT INTO public.ai_provider_keys (provider, api_key, is_active)
VALUES ('openai', 'SUA_CHAVE_AQUI', true);

-- OU Groq (gratuito)
INSERT INTO public.ai_provider_keys (provider, api_key, is_active)
VALUES ('groq', 'SUA_CHAVE_AQUI', true);
```

Para obter chaves gratuitas:
- Gemini: https://makersuite.google.com/app/apikey
- Groq: https://console.groq.com/keys
