-- =============================================
-- 🚨 EXECUTAR AGORA NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================
--
-- PROBLEMA: Erro ao criar agendamento
-- ERRO: "new row violates row-level security policy for table appointments"
--
-- SOLUÇÃO: Remover políticas conflitantes e criar política permissiva
-- TEMPO: ~30 segundos
--
-- =============================================

-- PASSO 1: Remover políticas antigas/conflitantes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;

-- PASSO 2: Criar política ÚNICA e PERMISSIVA
CREATE POLICY "Public can insert appointments"
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

-- PASSO 3: Garantir acesso total para service_role
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;

CREATE POLICY "Service role full access appointments"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- ✅ VERIFICAÇÃO (executar após os comandos acima)
-- =============================================

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

-- RESULTADO ESPERADO:
-- Deve mostrar 2 políticas:
-- 1. "Public can insert appointments" (INSERT para {anon,authenticated})
-- 2. "Service role full access appointments" (ALL para {service_role})

-- =============================================
-- 🧪 TESTE APÓS EXECUTAR
-- =============================================
--
-- 1. Abra uma aba anônima (Ctrl+Shift+N)
-- 2. Acesse: https://syshair.vercel.app/booking/SEU_SLUG
-- 3. Tente criar um agendamento
-- 4. ✅ Deve funcionar sem erro de RLS
--
-- =============================================
