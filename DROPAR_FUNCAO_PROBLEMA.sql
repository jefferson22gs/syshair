-- =====================================================
-- DROPAR FUNÇÃO PROBLEMÁTICA
-- Data: 2026-03-05
-- =====================================================

-- Dropar a função que está causando o erro
DROP FUNCTION IF EXISTS notify_new_appointment() CASCADE;

-- Verificar se foi removida
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'notify_new_appointment';

SELECT '✅ Função notify_new_appointment removida. Agora você pode criar agendamentos.' as message;
