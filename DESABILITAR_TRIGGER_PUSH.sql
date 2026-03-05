-- =====================================================
-- DESABILITAR TRIGGER DE PUSH NOTIFICATIONS
-- Data: 2026-03-05
-- =====================================================

-- Desabilitar o trigger que está causando erro ao criar agendamento
DROP TRIGGER IF EXISTS trigger_send_push_notification_on_appointment ON appointments;

-- Verificar se foi removido
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_send_push_notification_on_appointment';

SELECT '✅ Trigger desabilitado. Agora você pode criar agendamentos normalmente.' as message;
