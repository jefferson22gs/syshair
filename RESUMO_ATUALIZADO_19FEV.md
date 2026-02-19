# 🎯 RESUMO ATUALIZADO - 19/02/2026 12:30 UTC (09:30 BRT)

## ✅ PROBLEMAS CORRIGIDOS (7 bugs)

| # | Problema | Status | Arquivo SQL | Commit |
|---|----------|--------|-------------|--------|
| 1 | Dashboard data errada (UTC) | ✅ Deploy OK | - | 99bbd92 |
| 2 | Dashboard zerava agendamentos | ✅ Deploy OK | - | 99bbd92 |
| 3 | Appointments navegação errada | ✅ Deploy OK | - | 99bbd92 |
| 4 | Erro ao salvar templates | ⏳ SQL pendente | EXECUTAR_SQL_SIMPLES.sql | fbb6824 |
| 5 | Erro 401 "Melhorar com IA" | ✅ Deploy OK | - | a5d630b |
| 6 | Broadcast não enviava | ✅ Deploy OK | a5d630b |
| 7 | **Erro RLS ao criar agendamento** | ⏳ **SQL pendente** | **FIX_RLS_APPOINTMENTS.sql** | **9c58184** |

---

## 🚨 AÇÃO URGENTE - EXECUTAR 2 SCRIPTS SQL

### Script 1: Corrigir colunas (templates e IA)
**Arquivo:** `EXECUTAR_SQL_SIMPLES.sql`
**Blocos:** 2 a 7 (BLOCO 1 já foi executado)
**Tempo:** ~2 minutos

### Script 2: Corrigir RLS de appointments (NOVO)
**Arquivo:** `FIX_RLS_APPOINTMENTS.sql`
**Tempo:** ~30 segundos

**Acesse:** https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

---

## 📋 PASSO A PASSO

### 1️⃣ Executar Script 1 (se ainda não fez)

Abra `EXECUTAR_SQL_SIMPLES.sql` e execute os blocos 2 a 7:

```sql
-- BLOCO 2
ALTER TABLE public.ai_provider_keys
RENAME COLUMN key_value TO api_key;

-- BLOCO 3
ALTER TABLE public.ai_provider_keys
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- BLOCO 4
UPDATE public.ai_provider_keys
SET is_active = (status = 'active');

-- BLOCO 5
ALTER TABLE public.ai_provider_keys
DROP COLUMN status;

-- BLOCO 6
ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- BLOCO 7
ALTER TABLE public.broadcast_messages
RENAME COLUMN phone TO recipient_phone;
```

**Ignore erros "column does not exist" ou "already exists"** - significa que já está correto.

---

### 2️⃣ Executar Script 2 (NOVO - corrige agendamentos)

Abra `FIX_RLS_APPOINTMENTS.sql` e execute TODO o conteúdo:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

-- Criar política única
CREATE POLICY "Allow public appointment creation"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    salon_id IN (
        SELECT id FROM public.salons
        WHERE (is_active IS NULL OR is_active = true)
    )
);

-- Service role access
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 🧪 TESTES APÓS SQL

### Teste 1: Criar agendamento público
1. Abra uma aba anônima (Ctrl+Shift+N)
2. Acesse: https://syshair.vercel.app/booking/SEU_SLUG_AQUI
3. Tente criar um agendamento
4. **Resultado esperado:** ✅ Agendamento criado com sucesso

### Teste 2: Salvar template
1. https://syshair.vercel.app/admin/broadcast
2. Clique no ícone de arquivo
3. Salve um template
4. **Resultado esperado:** ✅ "Template salvo com sucesso!"

### Teste 3: Melhorar com IA
1. Digite um texto
2. Clique "Melhorar com IA"
3. **Resultado esperado:** ✅ Texto melhorado (se chave configurada) ou ❌ "No AI API key found"

### Teste 4: Disparar mensagens
1. Carregue contatos
2. Selecione 1-2 contatos
3. Envie mensagem
4. **Resultado esperado:** ✅ "Disparo iniciado" e mensagens enviadas em ~10 segundos

---

## 📊 COMMITS REALIZADOS (8 commits)

1. `99bbd92` - fix: timezone e filtro de data
2. `fbb6824` - fix: schema broadcast_templates e ai_provider_keys
3. `e1c1416` - docs: guia SQL simplificado
4. `e12bf81` - docs: resumo e status
5. `a5d630b` - fix: autenticação IA e broadcast
6. `fed012b` - docs: guia de verificação
7. `9c58184` - **fix: RLS policy appointments (NOVO)**

---

## 🔍 VERIFICAR SE SQL FOI EXECUTADO

Execute no Supabase SQL Editor:

```sql
-- Verificar colunas corretas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'broadcast_templates' AND column_name = 'content')
    OR (table_name = 'ai_provider_keys' AND column_name IN ('api_key', 'is_active'))
    OR (table_name = 'broadcast_messages' AND column_name IN ('recipient_phone', 'recipient_name', 'sent_at'))
)
ORDER BY table_name, column_name;

-- Verificar políticas de appointments
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
AND cmd = 'INSERT'
ORDER BY policyname;
```

**Resultado esperado:**
- 6 colunas corretas (content, api_key, is_active, recipient_phone, recipient_name, sent_at)
- 2 políticas INSERT: "Allow public appointment creation" e "Service role full access appointments"

---

## ⚠️ SE AINDA DER ERRO

**Erro RLS ao criar agendamento:**
- Verifique se executou o Script 2 (FIX_RLS_APPOINTMENTS.sql)
- Verifique se o salão está ativo no banco

**Erro ao salvar template:**
- Verifique se executou o Script 1 BLOCO 1 (renomear message → content)

**Erro 401 na IA:**
- Configure chave de API (Gemini gratuita: https://makersuite.google.com/app/apikey)

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Executar Script 1 (EXECUTAR_SQL_SIMPLES.sql blocos 2-7)
2. ✅ Executar Script 2 (FIX_RLS_APPOINTMENTS.sql completo)
3. ✅ Testar as 4 funcionalidades
4. ✅ Me avisar o resultado

**Tempo total:** ~5 minutos
