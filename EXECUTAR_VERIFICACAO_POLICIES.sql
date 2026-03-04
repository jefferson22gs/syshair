-- =============================================
-- VERIFICAÇÃO DE POLÍTICAS - APPOINTMENTS
-- Execute no Supabase SQL Editor AGORA
-- https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- =============================================

-- PASSO 1: Ver TODAS as políticas de INSERT ativas
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
AND cmd = 'INSERT'
ORDER BY policyname;

-- RESULTADO ESPERADO: Apenas 1 linha
-- appointments_insert_public | INSERT | {anon,authenticated} | PERMISSIVO

-- =============================================
-- SE APARECER MAIS DE 1 POLÍTICA, EXECUTE ISTO:
-- =============================================

-- PASSO 2: Remover TODAS as políticas de INSERT antigas (forçar limpeza)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'appointments'
        AND schemaname = 'public'
        AND cmd = 'INSERT'
        AND policyname != 'appointments_insert_public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', pol.policyname);
        RAISE NOTICE 'Removida política: %', pol.policyname;
    END LOOP;
END $$;

-- PASSO 3: Verificar novamente (deve mostrar apenas 1)
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
AND cmd = 'INSERT'
ORDER BY policyname;

-- =============================================
-- PASSO 4: Testar INSERT como anônimo
-- =============================================

-- Primeiro, pegue IDs válidos:
SELECT
    s.id as salon_id,
    s.name as salon_name,
    srv.id as service_id,
    srv.name as service_name,
    p.id as professional_id,
    p.name as professional_name
FROM public.salons s
LEFT JOIN public.services srv ON srv.salon_id = s.id
LEFT JOIN public.professionals p ON p.salon_id = s.id
WHERE s.is_active = true
LIMIT 1;

-- Depois teste o INSERT (substitua os UUIDs pelos valores acima):
/*
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
    'Teste RLS Fix',
    '11999999999',
    'pending',
    100.00,
    100.00
);
*/

-- Se o INSERT funcionar, delete o teste:
-- DELETE FROM public.appointments WHERE client_name = 'Teste RLS Fix';
