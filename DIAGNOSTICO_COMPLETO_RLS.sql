-- =============================================
-- DIAGNÓSTICO COMPLETO - RLS APPOINTMENTS
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Ver TODAS as políticas na tabela appointments (não só INSERT)
SELECT
    policyname,
    cmd,
    permissive,
    roles::text,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Verificar se há políticas ALL que podem estar bloqueando
SELECT
    policyname,
    cmd,
    roles::text,
    permissive
FROM pg_policies
WHERE tablename = 'appointments'
AND schemaname = 'public'
AND cmd = 'ALL';

-- 3. Verificar se RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'appointments'
AND schemaname = 'public';

-- 4. Verificar políticas nas tabelas relacionadas (podem bloquear o INSERT)
SELECT
    tablename,
    policyname,
    cmd,
    roles::text
FROM pg_policies
WHERE tablename IN ('salons', 'services', 'professionals')
AND schemaname = 'public'
AND cmd IN ('SELECT', 'ALL')
ORDER BY tablename, cmd;

-- 5. Testar se consegue ler as tabelas relacionadas como anon
-- (Se não conseguir ler, o INSERT falha por causa das foreign keys)
SET ROLE anon;

-- Testar leitura de salons
SELECT COUNT(*) as total_salons FROM public.salons WHERE is_active = true;

-- Testar leitura de services
SELECT COUNT(*) as total_services FROM public.services;

-- Testar leitura de professionals
SELECT COUNT(*) as total_professionals FROM public.professionals;

RESET ROLE;

-- 6. Ver se há triggers que podem estar bloqueando
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
AND event_object_schema = 'public';
