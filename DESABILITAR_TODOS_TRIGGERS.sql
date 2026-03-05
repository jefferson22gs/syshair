-- =====================================================
-- ENCONTRAR E DESABILITAR TODOS OS TRIGGERS PROBLEMÁTICOS
-- Data: 2026-03-05
-- =====================================================

-- 1. Ver todos os triggers na tabela appointments
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- 2. Desabilitar todos os triggers que usam app.supabase_url
DROP TRIGGER IF EXISTS trigger_send_push_notification_on_appointment ON appointments;
DROP TRIGGER IF EXISTS trigger_send_whatsapp_confirmation ON appointments;
DROP TRIGGER IF EXISTS trigger_sync_to_google_calendar ON appointments;
DROP TRIGGER IF EXISTS send_appointment_confirmation_trigger ON appointments;
DROP TRIGGER IF EXISTS sync_appointment_to_google_calendar ON appointments;

-- 3. Verificar se foram removidos
SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments';

SELECT '✅ Todos os triggers problemáticos foram desabilitados.' as message;
