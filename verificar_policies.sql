-- Verificar políticas de INSERT ativas
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
