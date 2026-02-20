-- =============================================
-- EXECUTAR NO SUPABASE SQL EDITOR - FIX RLS APPOINTMENTS URGENTE
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- PROBLEMA: Algumas pessoas não conseguem criar agendamentos
-- ERRO: "new row violates row-level security policy for table appointments"

-- SOLUÇÃO DEFINITIVA: Política SUPER PERMISSIVA para agendamentos públicos

-- 1. REMOVER TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for public" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;

-- 2. CRIAR POLÍTICA SUPER PERMISSIVA (sem verificações complexas)
CREATE POLICY "Public can insert appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);  -- PERMITE TUDO, sem verificações

-- 3. Garantir que service role sempre tem acesso total
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. VERIFICAR se RLS está habilitado (deve estar)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'appointments';

-- 5. LISTAR todas as políticas ativas
SELECT
    policyname,
    cmd,
    roles::text,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =============================================
-- RESULTADO ESPERADO:
-- =============================================
-- Deve mostrar:
-- 1. "Public can insert appointments" (INSERT, anon/authenticated, WITH CHECK = true)
-- 2. "Service role full access appointments" (ALL, service_role)
-- 3. Outras políticas de SELECT/UPDATE/DELETE (se existirem)

-- =============================================
-- TESTE APÓS EXECUTAR:
-- =============================================
-- 1. Abra uma aba anônima no navegador
-- 2. Acesse a página pública de agendamento
-- 3. Tente criar um agendamento
-- 4. Deve funcionar SEM ERROS
