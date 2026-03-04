-- =============================================
-- FIX APPOINTMENTS RLS - V3 (DEFINITIVO)
-- Data: 2026-02-19 15:14 UTC
-- =============================================

-- PROBLEMA: Múltiplas políticas conflitantes criadas em diferentes migrations
-- causando erro "new row violates row-level security policy for table appointments"

-- SOLUÇÃO: Remover TODAS as políticas de INSERT e criar UMA ÚNICA política permissiva

-- 1. Remover TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON public.appointments;

-- 2. Criar política ÚNICA e PERMISSIVA para INSERT
-- Permite que QUALQUER pessoa (anon ou authenticated) crie agendamentos
CREATE POLICY "appointments_insert_public"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Garantir que service_role tem acesso total
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Service role can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_service_role_all" ON public.appointments;

CREATE POLICY "appointments_service_role_all"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Comentário explicativo
COMMENT ON POLICY "appointments_insert_public" ON public.appointments IS
'Permite que usuários anônimos e autenticados criem agendamentos. Validações de negócio (salão ativo, horário disponível, etc) são feitas no frontend e edge functions.';
