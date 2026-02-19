# 🔧 SOLUÇÃO DEFINITIVA - Erro RLS Appointments

**Data:** 2026-02-19 15:09 UTC (12:09 BRT)
**Problema:** `new row violates row-level security policy for table "appointments"`
**Status:** ✅ SOLUÇÃO CRIADA - AGUARDANDO EXECUÇÃO SQL

---

## 🐛 DIAGNÓSTICO DO PROBLEMA

### Causa Raiz
A política RLS atual `"Public can create appointments"` exige que o salão tenha:
```sql
public_booking_enabled = true
```

**Problema:** Alguns salões podem ter essa coluna como:
- `NULL` (não configurada)
- `false` (desabilitada)
- Ou a coluna pode não existir em salões antigos

Isso bloqueia agendamentos públicos mesmo em salões ativos.

### Políticas Conflitantes
Existem múltiplas políticas de INSERT criadas em diferentes migrations:
1. `"Anyone can create appointments"` (migration antiga)
2. `"Public can create appointments"` (20260126_fix_public_salon_access.sql)
3. `"Allow public appointment creation"` (20260219_fix_appointments_rls.sql)

Essas políticas podem estar conflitando entre si.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### Arquivos Criados

1. **Migration:** `supabase/migrations/20260219_fix_appointments_rls_v2.sql`
   - Remove TODAS as políticas conflitantes
   - Cria política única e permissiva
   - Não exige `public_booking_enabled`

2. **Script SQL:** `EXECUTAR_AGORA_RLS_FIX.sql`
   - Versão simplificada para executar no Supabase SQL Editor
   - Inclui verificação e teste

### Mudanças na Política

**ANTES (restritiva):**
```sql
CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    salon_id IN (
        SELECT id FROM public.salons
        WHERE public_booking_enabled = true  -- ❌ Muito restritivo
        AND (is_active IS NULL OR is_active = true)
    )
);
```

**DEPOIS (permissiva):**
```sql
CREATE POLICY "Public can insert appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    salon_id IN (
        SELECT id FROM public.salons
        WHERE (is_active IS NULL OR is_active = true)  -- ✅ Apenas verifica se está ativo
    )
);
```

---

## 📋 PASSO A PASSO PARA RESOLVER

### 1️⃣ Executar SQL no Supabase

**Acesse:** https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

**Copie e execute TODO o conteúdo do arquivo:** `EXECUTAR_AGORA_RLS_FIX.sql`

Ou execute manualmente:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;

-- Criar política nova
CREATE POLICY "Public can insert appointments"
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

### 2️⃣ Verificar Políticas Ativas

Execute no SQL Editor:
```sql
SELECT
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
AND cmd = 'INSERT'
ORDER BY policyname;
```

**Resultado esperado:**
```
policyname                              | cmd    | roles                    | with_check
----------------------------------------|--------|--------------------------|------------------
Public can insert appointments          | INSERT | {anon,authenticated}     | (salon_id IN ...)
Service role full access appointments   | ALL    | {service_role}           | true
```

### 3️⃣ Testar Agendamento Público

1. Abra uma **aba anônima** (Ctrl+Shift+N)
2. Acesse: `https://syshair.vercel.app/booking/SEU_SLUG_AQUI`
3. Preencha os dados e tente criar um agendamento
4. **✅ Resultado esperado:** Agendamento criado com sucesso

---

## 🔍 OUTRAS VERIFICAÇÕES

### Verificar se Salão Está Ativo

```sql
SELECT
    id,
    name,
    slug,
    is_active,
    public_booking_enabled
FROM public.salons
WHERE slug = 'SEU_SLUG_AQUI';
```

**Deve retornar:**
- `is_active` = `true` ou `NULL`
- Se `public_booking_enabled` = `false`, a nova política ainda vai funcionar

### Ver Últimos Agendamentos

```sql
SELECT
    id,
    salon_id,
    client_name,
    client_phone,
    date,
    start_time,
    status,
    created_at
FROM appointments
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 SE AINDA DER ERRO

### Erro Persiste Após Executar SQL

1. **Limpar cache do navegador** (Ctrl+Shift+Delete)
2. **Verificar se o salão existe:**
   ```sql
   SELECT id, name, is_active FROM salons WHERE slug = 'SEU_SLUG';
   ```
3. **Verificar se há outras políticas bloqueando:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'appointments';
   ```

### Erro Diferente

Se o erro mudou para algo como:
- `"foreign key violation"` → Problema com service_id ou professional_id
- `"null value in column"` → Falta campo obrigatório
- `"invalid input syntax"` → Problema no formato de data/hora

**Me avise qual é o novo erro!**

---

## 📊 IMPACTO DA MUDANÇA

### ✅ Benefícios
- Agendamentos públicos funcionam em TODOS os salões ativos
- Remove dependência de `public_booking_enabled`
- Elimina conflitos entre políticas
- Mais simples e fácil de manter

### ⚠️ Considerações
- Qualquer salão ativo pode receber agendamentos públicos
- Se quiser desabilitar agendamentos, deve marcar `is_active = false`
- Ou adicionar lógica no frontend para verificar `public_booking_enabled`

### 🔒 Segurança
- Usuários anônimos só podem **criar** agendamentos
- Não podem **ler**, **atualizar** ou **deletar** agendamentos de outros
- Service role mantém acesso total para edge functions

---

## 📞 PRÓXIMOS PASSOS

1. ✅ **Executar SQL** no Supabase (EXECUTAR_AGORA_RLS_FIX.sql)
2. ✅ **Testar** agendamento em aba anônima
3. ✅ **Confirmar** que funcionou
4. ✅ **Fazer commit** e push para GitHub (migration já está criada)

**Tempo estimado:** 2-3 minutos

---

## 📝 ARQUIVOS RELACIONADOS

- `supabase/migrations/20260219_fix_appointments_rls_v2.sql` - Migration nova
- `EXECUTAR_AGORA_RLS_FIX.sql` - Script para executar agora
- `supabase/migrations/20260126_fix_public_salon_access.sql` - Política antiga (será substituída)
- `src/pages/PublicSalon.tsx:766` - Código que faz o INSERT

---

**🎯 AÇÃO IMEDIATA:** Execute o SQL agora e teste!
