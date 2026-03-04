-- =============================================
-- SOLUÇÃO DEFINITIVA - RLS APPOINTMENTS
-- Execute este script COMPLETO no Supabase SQL Editor
-- =============================================

-- PASSO 1: DESABILITAR RLS temporariamente para limpar tudo
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- PASSO 2: REMOVER TODAS as políticas existentes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'appointments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', pol.policyname);
    END LOOP;
END $$;

-- PASSO 3: REABILITAR RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- PASSO 4: CRIAR POLÍTICAS SIMPLES E PERMISSIVAS

-- Política 1: Qualquer pessoa pode INSERIR agendamentos (público)
CREATE POLICY "appointments_insert_public"
ON public.appointments
FOR INSERT
TO public  -- public = todos (anon + authenticated)
WITH CHECK (true);

-- Política 2: Service role tem acesso total
CREATE POLICY "appointments_service_role_all"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Política 3: Usuários autenticados podem ver seus próprios agendamentos
CREATE POLICY "appointments_select_own"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    salon_id IN (
        SELECT salon_id FROM public.professionals
        WHERE user_id = auth.uid()
    )
    OR
    salon_id IN (
        SELECT id FROM public.salons
        WHERE owner_id = auth.uid()
    )
);

-- Política 4: Donos de salão podem gerenciar agendamentos
CREATE POLICY "appointments_manage_owner"
ON public.appointments
FOR ALL
TO authenticated
USING (
    salon_id IN (
        SELECT id FROM public.salons
        WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    salon_id IN (
        SELECT id FROM public.salons
        WHERE owner_id = auth.uid()
    )
);

-- PASSO 5: VERIFICAR resultado
SELECT
    policyname,
    cmd,
    roles::text,
    CASE
        WHEN with_check = 'true'::text THEN 'PERMITE TUDO'
        ELSE substring(with_check::text, 1, 50)
    END as check_rule
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =============================================
-- TESTE IMEDIATAMENTE:
-- =============================================
-- 1. Abra aba anônima
-- 2. Tente criar agendamento
-- 3. DEVE FUNCIONAR sem erro de RLS
