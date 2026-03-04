-- =============================================
-- SOLUÇÃO DEFINITIVA RLS - APPOINTMENTS
-- Execute no Supabase SQL Editor
-- =============================================

-- PASSO 1: Verificar políticas atuais
SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public';

-- PASSO 2: Remover TODAS as políticas de INSERT
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for public" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;

-- PASSO 3: Criar política SUPER PERMISSIVA
CREATE POLICY "allow_all_inserts"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- PASSO 4: Verificar resultado
SELECT policyname, cmd, roles::text, with_check
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =============================================
-- TESTE: Tente criar um agendamento após executar
-- =============================================
