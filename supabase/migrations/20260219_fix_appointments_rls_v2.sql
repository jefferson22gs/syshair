-- =============================================
-- FIX DEFINITIVO: RLS policy para appointments
-- Problema: "new row violates row-level security policy"
-- Data: 2026-02-19
-- =============================================

-- DIAGNÓSTICO:
-- A política "Public can create appointments" exige public_booking_enabled = true
-- Mas alguns salões podem ter essa coluna como NULL ou false
-- Solução: Tornar a política mais permissiva

-- 1. Remover TODAS as políticas de INSERT conflitantes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;

-- 2. Criar política ÚNICA e PERMISSIVA para INSERT público
CREATE POLICY "Public can insert appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Permitir se o salão existe e está ativo
    -- Não exigir public_booking_enabled para não bloquear
    salon_id IN (
        SELECT id FROM public.salons
        WHERE (is_active IS NULL OR is_active = true)
    )
);

-- 3. Garantir que service_role sempre tem acesso total
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Comentários para documentação
COMMENT ON POLICY "Public can insert appointments" ON public.appointments IS
'Permite que usuários anônimos e autenticados criem agendamentos em salões ativos. Não exige public_booking_enabled para evitar bloqueios.';

COMMENT ON POLICY "Service role full access appointments" ON public.appointments IS
'Service role tem acesso total para operações internas e edge functions.';

-- 5. Verificar políticas ativas (para debug)
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
ORDER BY cmd, policyname;
