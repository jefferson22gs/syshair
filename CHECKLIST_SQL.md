# ✅ CHECKLIST DE EXECUÇÃO SQL

## Script 1: EXECUTAR_SQL_SIMPLES.sql
**Status:** ⏳ Pendente (execute os blocos 2 a 7)

## Script 2: FIX_RLS_APPOINTMENTS.sql
**Status:** ✅ CONCLUÍDO (você acabou de executar)

---

## 📋 AGORA EXECUTE O SCRIPT 1

Copie e cole cada bloco no SQL Editor:

### BLOCO 2:
```sql
ALTER TABLE public.ai_provider_keys
RENAME COLUMN key_value TO api_key;
```

### BLOCO 3:
```sql
ALTER TABLE public.ai_provider_keys
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

### BLOCO 4:
```sql
UPDATE public.ai_provider_keys
SET is_active = (status = 'active');
```

### BLOCO 5:
```sql
ALTER TABLE public.ai_provider_keys
DROP COLUMN status;
```

### BLOCO 6:
```sql
ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
```

### BLOCO 7:
```sql
ALTER TABLE public.broadcast_messages
RENAME COLUMN phone TO recipient_phone;
```

---

## ⚠️ IMPORTANTE
- Execute um bloco por vez
- Se der erro "column does not exist" ou "already exists" = **IGNORE e pule para o próximo**
- Isso é normal se você já executou antes

---

## 🧪 APÓS EXECUTAR TUDO

Teste:
1. ✅ Criar agendamento público (aba anônima)
2. ✅ Salvar template
3. ✅ Melhorar com IA
4. ✅ Disparar mensagens

**Me avise quando terminar de executar os blocos 2 a 7!**
