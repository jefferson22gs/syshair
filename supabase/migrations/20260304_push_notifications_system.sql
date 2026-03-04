-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES PUSH PARA AGENDAMENTOS
-- Envia notificação para dono do salão quando há novo agendamento
-- =====================================================

-- 1. Criar função para enviar notificação push
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_salon_owner_id UUID;
    v_salon_name TEXT;
    v_client_name TEXT;
    v_service_name TEXT;
    v_appointment_time TEXT;
BEGIN
    -- Buscar dados do salão e owner
    SELECT s.owner_id, s.name
    INTO v_salon_owner_id, v_salon_name
    FROM salons s
    WHERE s.id = NEW.salon_id;

    -- Buscar nome do serviço
    SELECT name INTO v_service_name
    FROM services
    WHERE id = NEW.service_id;

    -- Preparar dados
    v_client_name := COALESCE(NEW.client_name, 'Cliente');
    v_appointment_time := NEW.start_time;

    -- Inserir notificação para ser processada
    INSERT INTO notifications (
        salon_id,
        appointment_id,
        type,
        channel,
        title,
        message,
        status
    ) VALUES (
        NEW.salon_id,
        NEW.id,
        'new_appointment',
        'push',
        '🎉 Novo Agendamento!',
        v_client_name || ' agendou ' || v_service_name || ' para ' || TO_CHAR(NEW.date::DATE, 'DD/MM') || ' às ' || v_appointment_time,
        'pending'
    );

    -- Chamar Edge Function para enviar push (via HTTP)
    PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'salonId', NEW.salon_id,
            'ownerId', v_salon_owner_id,
            'title', '🎉 Novo Agendamento!',
            'body', v_client_name || ' agendou ' || v_service_name,
            'data', jsonb_build_object(
                'appointmentId', NEW.id,
                'type', 'new_appointment'
            )
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para novos agendamentos
DROP TRIGGER IF EXISTS trigger_notify_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_appointment();

-- 3. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(status, created_at) WHERE status = 'pending';

-- 4. Criar função para buscar subscriptions ativas de um usuário
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.endpoint,
        ps.p256dh,
        ps.auth
    FROM push_subscriptions ps
    WHERE ps.user_id = p_user_id
      AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para buscar subscriptions de um salão
CREATE OR REPLACE FUNCTION get_salon_push_subscriptions(p_salon_id UUID)
RETURNS TABLE (
    id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.endpoint,
        ps.p256dh,
        ps.auth,
        ps.user_id
    FROM push_subscriptions ps
    WHERE ps.salon_id = p_salon_id
      AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários
COMMENT ON FUNCTION notify_new_appointment() IS 'Envia notificação push quando novo agendamento é criado';
COMMENT ON FUNCTION get_user_push_subscriptions(UUID) IS 'Busca todas as subscriptions ativas de um usuário';
COMMENT ON FUNCTION get_salon_push_subscriptions(UUID) IS 'Busca todas as subscriptions ativas de um salão';

-- =====================================================
-- SUCESSO! Sistema de notificações push configurado
-- =====================================================

SELECT 'Sistema de notificações push criado com sucesso!' as message;
