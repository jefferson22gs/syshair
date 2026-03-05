-- =====================================================
-- ENCONTRAR FUNÇÕES QUE USAM app.supabase_url
-- Data: 2026-03-05
-- =====================================================

-- 1. Listar todas as funções que podem estar sendo chamadas
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%appointment%'
    OR routine_name LIKE '%notification%'
    OR routine_name LIKE '%whatsapp%'
    OR routine_name LIKE '%google%'
)
ORDER BY routine_name;

-- 2. Ver definição de funções específicas que podem ter o problema
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
    'send_appointment_confirmation',
    'send_push_notification',
    'sync_to_google_calendar',
    'notify_new_appointment'
)
AND pronamespace = 'public'::regnamespace;
