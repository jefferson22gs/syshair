-- =============================================
-- SOLUÇÃO DEFINITIVA - RLS APPOINTMENTS
-- Execute no Supabase SQL Editor AGORA
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- PROBLEMA: Múltiplas políticas conflitantes em diferentes migrations
-- SOLUÇÃO: Remover TODAS as políticas de INSERT e criar UMA ÚNICA política permissiva

-- PASSO 1: Remover TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON public.appointments;

-- PASSO 2: Criar política ÚNICA e PERMISSIVA para INSERT
-- Esta política permite que QUALQUER pessoa (anon ou authenticated) crie agendamentos
CREATE POLICY "appointments_insert_public"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- PASSO 3: Garantir que service_role tem acesso total
DROP POLICY IF EXISTS "Service role full access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Service role can manage appointments" ON public.appointments;

CREATE POLICY "appointments_service_role_all"
ON public.appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- PASSO 4: Verificar políticas ativas (deve mostrar apenas as 2 novas + as de SELECT/UPDATE/DELETE)
SELECT
    policyname,
    cmd,
    roles::text,
    CASE
        WHEN with_check = 'true' THEN 'PERMISSIVO'
        ELSE substring(with_check::text, 1, 100)
    END as condicao
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- RESULTADO ESPERADO:
-- appointments_insert_public        | INSERT | {anon,authenticated} | PERMISSIVO
-- appointments_service_role_all     | ALL    | {service_role}       | PERMISSIVO
-- (+ outras políticas de SELECT/UPDATE/DELETE para owners)

-- PASSO 5: Testar se funcionou
-- Copie o salon_id de um salão ativo e teste:
/*
SELECT id, name, slug FROM public.salons WHERE is_active = true LIMIT 1;

-- Depois teste o INSERT (substitua os UUIDs pelos valores reais):
INSERT INTO public.appointments (
    salon_id,
    service_id,
    professional_id,
    date,
    start_time,
    end_time,
    client_name,
    client_phone,
    status,
    price,
    final_price
) VALUES (
    'UUID_DO_SALAO',
    'UUID_DO_SERVICO',
    'UUID_DO_PROFISSIONAL',
    '2026-02-20',
    '10:00',
    '11:00',
    'Teste RLS',
    '11999999999',
    'pending',
    100.00,
    100.00
);

-- Se der erro, execute:
SELECT * FROM pg_policies WHERE tablename = 'appointments' AND cmd = 'INSERT';
*/
