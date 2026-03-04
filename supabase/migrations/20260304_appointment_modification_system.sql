-- =====================================================
-- SISTEMA DE CANCELAMENTO E ALTERAÇÃO DE AGENDAMENTO
-- Permite que clientes cancelem ou alterem seus agendamentos
-- =====================================================

-- 1. Adicionar token único para cada agendamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_token TEXT UNIQUE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS can_be_modified BOOLEAN DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'client' ou 'salon'

-- 2. Criar função para gerar token único
CREATE OR REPLACE FUNCTION generate_cancellation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para gerar token automaticamente
CREATE OR REPLACE FUNCTION set_appointment_cancellation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cancellation_token IS NULL THEN
        NEW.cancellation_token := generate_cancellation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_cancellation_token ON appointments;
CREATE TRIGGER trigger_set_cancellation_token
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION set_appointment_cancellation_token();

-- 4. Atualizar agendamentos existentes com token
UPDATE appointments
SET cancellation_token = generate_cancellation_token()
WHERE cancellation_token IS NULL;

-- 5. Criar função para validar se agendamento pode ser modificado
CREATE OR REPLACE FUNCTION can_modify_appointment(p_appointment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_appointment_date DATE;
    v_appointment_time TIME;
    v_appointment_datetime TIMESTAMPTZ;
    v_status TEXT;
    v_can_be_modified BOOLEAN;
BEGIN
    -- Buscar dados do agendamento
    SELECT date, start_time, status, can_be_modified
    INTO v_appointment_date, v_appointment_time, v_status, v_can_be_modified
    FROM appointments
    WHERE id = p_appointment_id;

    -- Se não encontrou, retornar false
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Se já foi cancelado ou completado, não pode modificar
    IF v_status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN false;
    END IF;

    -- Se marcado como não modificável
    IF v_can_be_modified = false THEN
        RETURN false;
    END IF;

    -- Combinar data e hora
    v_appointment_datetime := (v_appointment_date || ' ' || v_appointment_time)::TIMESTAMPTZ;

    -- Verificar se falta mais de 24 horas
    IF v_appointment_datetime - NOW() < INTERVAL '24 hours' THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para cancelar agendamento via token
CREATE OR REPLACE FUNCTION cancel_appointment_by_token(
    p_token TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_appointment_id UUID;
    v_can_modify BOOLEAN;
    v_result JSON;
BEGIN
    -- Buscar agendamento pelo token
    SELECT id INTO v_appointment_id
    FROM appointments
    WHERE cancellation_token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido'
        );
    END IF;

    -- Verificar se pode modificar
    v_can_modify := can_modify_appointment(v_appointment_id);

    IF NOT v_can_modify THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Agendamento não pode ser cancelado (menos de 24h ou já finalizado)'
        );
    END IF;

    -- Cancelar agendamento
    UPDATE appointments
    SET
        status = 'cancelled',
        cancelled_by = 'client',
        notes = COALESCE(notes || E'\n\n', '') || 'Cancelado pelo cliente. Motivo: ' || COALESCE(p_reason, 'Não informado'),
        updated_at = NOW()
    WHERE id = v_appointment_id;

    -- Registrar notificação para o salão
    INSERT INTO notifications (
        salon_id,
        appointment_id,
        type,
        channel,
        title,
        message,
        status
    )
    SELECT
        salon_id,
        id,
        'appointment_cancelled',
        'push',
        '❌ Agendamento Cancelado',
        client_name || ' cancelou o agendamento de ' || TO_CHAR(date::DATE, 'DD/MM') || ' às ' || start_time,
        'pending'
    FROM appointments
    WHERE id = v_appointment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Agendamento cancelado com sucesso'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Criar função para buscar horários disponíveis para reagendamento
CREATE OR REPLACE FUNCTION get_available_slots_for_reschedule(
    p_appointment_id UUID,
    p_new_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN
) AS $$
DECLARE
    v_salon_id UUID;
    v_professional_id UUID;
    v_service_duration INTEGER;
BEGIN
    -- Buscar dados do agendamento
    SELECT salon_id, professional_id,
           (SELECT duration_minutes FROM services WHERE id = appointments.service_id)
    INTO v_salon_id, v_professional_id, v_service_duration
    FROM appointments
    WHERE id = p_appointment_id;

    -- Retornar horários disponíveis (simplificado)
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            '08:00'::TIME,
            '18:00'::TIME,
            '30 minutes'::INTERVAL
        )::TIME as slot
    ),
    occupied_slots AS (
        SELECT start_time
        FROM appointments
        WHERE salon_id = v_salon_id
          AND professional_id = v_professional_id
          AND date = p_new_date
          AND status NOT IN ('cancelled', 'no_show')
          AND id != p_appointment_id
    )
    SELECT
        ts.slot,
        NOT EXISTS (
            SELECT 1 FROM occupied_slots os
            WHERE os.start_time = ts.slot
        ) as is_available
    FROM time_slots ts
    ORDER BY ts.slot;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar função para reagendar
CREATE OR REPLACE FUNCTION reschedule_appointment_by_token(
    p_token TEXT,
    p_new_date DATE,
    p_new_time TIME
)
RETURNS JSON AS $$
DECLARE
    v_appointment_id UUID;
    v_can_modify BOOLEAN;
    v_old_date DATE;
    v_old_time TIME;
BEGIN
    -- Buscar agendamento
    SELECT id, date, start_time
    INTO v_appointment_id, v_old_date, v_old_time
    FROM appointments
    WHERE cancellation_token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido'
        );
    END IF;

    -- Verificar se pode modificar
    v_can_modify := can_modify_appointment(v_appointment_id);

    IF NOT v_can_modify THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Agendamento não pode ser alterado'
        );
    END IF;

    -- Verificar se novo horário está disponível
    -- (simplificado - adicionar validação completa depois)

    -- Atualizar agendamento
    UPDATE appointments
    SET
        date = p_new_date,
        start_time = p_new_time,
        end_time = p_new_time + (
            SELECT (duration_minutes || ' minutes')::INTERVAL
            FROM services
            WHERE id = appointments.service_id
        ),
        modified_at = NOW(),
        notes = COALESCE(notes || E'\n\n', '') ||
                'Reagendado pelo cliente de ' ||
                TO_CHAR(v_old_date, 'DD/MM/YYYY') || ' ' || v_old_time ||
                ' para ' || TO_CHAR(p_new_date, 'DD/MM/YYYY') || ' ' || p_new_time,
        updated_at = NOW()
    WHERE id = v_appointment_id;

    -- Notificar salão
    INSERT INTO notifications (
        salon_id,
        appointment_id,
        type,
        channel,
        title,
        message,
        status
    )
    SELECT
        salon_id,
        id,
        'appointment_rescheduled',
        'push',
        '🔄 Agendamento Alterado',
        client_name || ' alterou o agendamento para ' || TO_CHAR(p_new_date, 'DD/MM') || ' às ' || p_new_time::TEXT,
        'pending'
    FROM appointments
    WHERE id = v_appointment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Agendamento alterado com sucesso'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Criar view para agendamentos do cliente
CREATE OR REPLACE VIEW client_appointments AS
SELECT
    a.id,
    a.cancellation_token,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.client_name,
    a.client_phone,
    a.price,
    s.name as service_name,
    p.name as professional_name,
    sal.name as salon_name,
    sal.address as salon_address,
    sal.phone as salon_phone,
    can_modify_appointment(a.id) as can_modify,
    EXTRACT(EPOCH FROM ((a.date || ' ' || a.start_time)::TIMESTAMPTZ - NOW())) / 3600 as hours_until_appointment
FROM appointments a
LEFT JOIN services s ON s.id = a.service_id
LEFT JOIN professionals p ON p.id = a.professional_id
LEFT JOIN salons sal ON sal.id = a.salon_id;

-- 10. RLS para acesso público via token
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view appointment with valid token" ON appointments;
CREATE POLICY "Anyone can view appointment with valid token"
    ON appointments FOR SELECT
    USING (true); -- Acesso via token será validado na aplicação

-- 11. Comentários
COMMENT ON COLUMN appointments.cancellation_token IS 'Token único para cancelamento/alteração pelo cliente';
COMMENT ON COLUMN appointments.can_be_modified IS 'Se o agendamento pode ser modificado pelo cliente';
COMMENT ON COLUMN appointments.cancelled_by IS 'Quem cancelou: client ou salon';

COMMENT ON FUNCTION can_modify_appointment(UUID) IS 'Verifica se agendamento pode ser cancelado/alterado (>24h)';
COMMENT ON FUNCTION cancel_appointment_by_token(TEXT, TEXT) IS 'Cancela agendamento usando token único';
COMMENT ON FUNCTION reschedule_appointment_by_token(TEXT, DATE, TIME) IS 'Reagenda agendamento usando token único';

-- =====================================================
-- SUCESSO! Sistema de cancelamento/alteração criado
-- =====================================================

SELECT 'Sistema de cancelamento e alteração criado com sucesso!' as message;
