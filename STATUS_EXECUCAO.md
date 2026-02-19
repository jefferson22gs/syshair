# ✅ STATUS DA EXECUÇÃO

## BLOCO 1 ✅ CONCLUÍDO
❌ Erro: "column message does not exist"
✅ **Isso é BOM!** Significa que `message` já foi renomeado para `content`

---

## 📋 PRÓXIMOS PASSOS - Execute agora:

### BLOCO 2: (copie e cole no SQL Editor)
```sql
ALTER TABLE public.ai_provider_keys
RENAME COLUMN key_value TO api_key;
```

Se der erro "column key_value does not exist" = pule para o BLOCO 3

---

### BLOCO 3:
```sql
ALTER TABLE public.ai_provider_keys
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

Se der erro "column is_active already exists" = pule para o BLOCO 4

---

### BLOCO 4:
```sql
UPDATE public.ai_provider_keys
SET is_active = (status = 'active');
```

Se der erro "column status does not exist" = pule para o BLOCO 5

---

### BLOCO 5:
```sql
ALTER TABLE public.ai_provider_keys
DROP COLUMN status;
```

Se der erro "column status does not exist" = pule para o BLOCO 6

---

### BLOCO 6:
```sql
ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
```

Este sempre funciona (IF NOT EXISTS)

---

### BLOCO 7:
```sql
ALTER TABLE public.broadcast_messages
RENAME COLUMN phone TO recipient_phone;
```

Se der erro "column phone does not exist" = **TUDO PRONTO!**

---

## 🎯 APÓS TERMINAR TODOS OS BLOCOS

Execute a verificação final:

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'broadcast_templates' AND column_name = 'content')
    OR (table_name = 'ai_provider_keys' AND column_name IN ('api_key', 'is_active'))
    OR (table_name = 'broadcast_messages' AND column_name IN ('recipient_phone', 'recipient_name', 'sent_at'))
)
ORDER BY table_name, column_name;
```

Deve retornar 6 linhas mostrando todas as colunas corretas.

---

## ⚡ DEPOIS DE EXECUTAR TUDO

1. Recarregue a página https://syshair.vercel.app/admin/broadcast
2. Teste salvar um template
3. Teste "Melhorar com IA" (se tiver chave configurada)
4. Teste disparar mensagens

**Me avise quando terminar de executar todos os blocos!**
