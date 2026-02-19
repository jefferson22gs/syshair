-- =============================================
-- FIX: RLS policy para appointments - permitir INSERT público
-- Problema: "new row violates row-level security policy"
-- =============================================

-- Remover políticas duplicadas/conflitantes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

-- Criar política única e permissiva para INSERT
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

-- Garantir que service role sempre tem acesso
CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow public appointment creation" ON public.appointments IS
'Permite que qualquer pessoa (anon ou authenticated) crie agendamentos em salões ativos';
