-- =============================================
-- DIAGNÓSTICO PROFUNDO - RLS APPOINTMENTS
-- Execute no Supabase SQL Editor
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- 1. VER TODAS AS POLÍTICAS ATIVAS NA TABELA APPOINTMENTS
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

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'appointments'
AND schemaname = 'public';

-- 3. VERIFICAR POLÍTICAS NA TABELA SALONS (pode estar bloqueando o subquery)
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
WHERE tablename = 'salons'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 4. VERIFICAR SE RLS ESTÁ HABILITADO EM SALONS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'salons'
AND schemaname = 'public';

-- 5. TESTAR SE USUÁRIO ANÔNIMO CONSEGUE LER SALONS
-- (Execute como anônimo ou teste com SET ROLE)
SELECT id, name, slug, is_active, public_booking_enabled
FROM public.salons
WHERE (is_active IS NULL OR is_active = true)
LIMIT 5;

-- 6. VERIFICAR POLÍTICAS EM SERVICES E PROFESSIONALS
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('services', 'professionals')
AND schemaname = 'public'
ORDER BY tablename, cmd;

-- 7. VERIFICAR ESTRUTURA DA TABELA APPOINTMENTS
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'appointments'
ORDER BY ordinal_position;

-- 8. VERIFICAR FOREIGN KEYS
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'appointments';

-- 9. TESTAR INSERT COMO SERVICE ROLE (deve funcionar)
-- Substitua os valores pelos dados reais do teste
/*
SET ROLE service_role;
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
    'Teste Cliente',
    '11999999999',
    'pending',
    100.00,
    100.00
);
RESET ROLE;
*/

-- 10. VERIFICAR SE HÁ TRIGGERS QUE PODEM ESTAR BLOQUEANDO
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
AND event_object_schema = 'public';
