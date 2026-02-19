-- =============================================
-- EXECUTAR NO SUPABASE SQL EDITOR - FIX RLS APPOINTMENTS
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- PROBLEMA: Algumas pessoas não conseguem criar agendamentos
-- ERRO: "new row violates row-level security policy for table appointments"

-- SOLUÇÃO: Remover políticas conflitantes e criar uma única política permissiva

-- 1. Remover políticas antigas/duplicadas
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

-- 2. Criar política única e permissiva para INSERT
CREATE POLICY "Allow public appointment creation"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Permitir se o salão existe e está ativo
    salon_id IN (
        SELECT id FROM public.salons
        WHERE (is_active IS NULL OR is_active = true)
    )
);

-- 3. Garantir que service role sempre tem acesso total
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Verificar políticas ativas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY policyname;

-- Resultado esperado:
-- Deve mostrar as políticas:
-- - "Allow public appointment creation" (INSERT para anon, authenticated)
-- - "Service role full access appointments" (ALL para service_role)
-- - "Salon members can view appointments" (SELECT)
-- - "Salon owners can manage appointments" (ALL)
