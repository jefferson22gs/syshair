-- =====================================================
-- MELHORIAS NA VISUALIZAÇÃO DA AGENDA
-- Mostra horários vagos e facilita adição manual
-- =====================================================

-- 1. Criar função para gerar grade de horários disponíveis
CREATE OR REPLACE FUNCTION get_schedule_grid(
    p_salon_id UUID,
    p_professional_id UUID,
    p_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN,
    appointment_id UUID,
    client_name TEXT,
    service_name TEXT,
    status TEXT,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH time_slots AS (
        -- Gerar slots de 30 em 30 minutos das 8h às 20h
        SELECT generate_series(
            '08:00'::TIME,
            '20:00'::TIME,
            '30 minutes'::INTERVAL
        )::TIME as slot
    ),
    appointments_on_date AS (
        SELECT
            a.id,
            a.start_time,
            a.end_time,
            a.client_name,
            a.status,
            s.name as service_name,
            s.duration_minutes
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.salon_id = p_salon_id
          AND a.professional_id = p_professional_id
          AND a.date = p_date
          AND a.status NOT IN ('cancelled', 'no_show')
    )
    SELECT
        ts.slot,
        NOT EXISTS (
            SELECT 1
            FROM appointments_on_date aod
            WHERE ts.slot >= aod.start_time
              AND ts.slot < aod.end_time
        ) as is_available,
        aod.id as appointment_id,
        aod.client_name,
        aod.service_name,
        aod.status,
        aod.duration_minutes
    FROM time_slots ts
    LEFT JOIN appointments_on_date aod ON ts.slot = aod.start_time
    ORDER BY ts.slot;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar função para obter resumo do dia
CREATE OR REPLACE FUNCTION get_day_summary(
    p_salon_id UUID,
    p_date DATE
)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_build_object(
        'date', p_date,
        'total_appointments', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'total_revenue', COALESCE(SUM(final_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0),
        'available_slots', (
            SELECT COUNT(*)
            FROM generate_series('08:00'::TIME, '20:00'::TIME, '30 minutes'::INTERVAL) slot
            WHERE NOT EXISTS (
                SELECT 1
                FROM appointments a
                WHERE a.salon_id = p_salon_id
                  AND a.date = p_date
                  AND slot::TIME >= a.start_time
                  AND slot::TIME < a.end_time
                  AND a.status NOT IN ('cancelled', 'no_show')
            )
        ),
        'professionals', json_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'appointments_count', (
                SELECT COUNT(*)
                FROM appointments a2
                WHERE a2.professional_id = p.id
                  AND a2.date = p_date
                  AND a2.status NOT IN ('cancelled', 'no_show')
            )
        ))
    ) INTO v_summary
    FROM appointments a
    LEFT JOIN professionals p ON p.id = a.professional_id
    WHERE a.salon_id = p_salon_id
      AND a.date = p_date;

    RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar função para sugerir próximo horário disponível
CREATE OR REPLACE FUNCTION suggest_next_available_slot(
    p_salon_id UUID,
    p_professional_id UUID,
    p_service_id UUID,
    p_preferred_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    suggested_date DATE,
    suggested_time TIME,
    is_today BOOLEAN,
    days_from_now INTEGER
) AS $$
DECLARE
    v_duration INTEGER;
    v_max_days INTEGER := 30; -- Buscar até 30 dias à frente
BEGIN
    -- Buscar duração do serviço
    SELECT duration_minutes INTO v_duration
    FROM services
    WHERE id = p_service_id;

    IF v_duration IS NULL THEN
        v_duration := 60; -- Padrão 1 hora
    END IF;

    RETURN QUERY
    WITH RECURSIVE dates AS (
        SELECT p_preferred_date as check_date, 0 as day_offset
        UNION ALL
        SELECT check_date + 1, day_offset + 1
        FROM dates
        WHERE day_offset < v_max_days
    ),
    available_slots AS (
        SELECT
            d.check_date,
            ts.slot,
            d.day_offset
        FROM dates d
        CROSS JOIN generate_series('08:00'::TIME, '19:00'::TIME, '30 minutes'::INTERVAL) ts(slot)
        WHERE NOT EXISTS (
            SELECT 1
            FROM appointments a
            WHERE a.salon_id = p_salon_id
              AND a.professional_id = p_professional_id
              AND a.date = d.check_date
              AND a.status NOT IN ('cancelled', 'no_show')
              AND (
                  -- Verificar se há conflito
                  (ts.slot >= a.start_time AND ts.slot < a.end_time)
                  OR
                  (ts.slot + (v_duration || ' minutes')::INTERVAL > a.start_time::TIME
                   AND ts.slot < a.end_time)
              )
        )
        -- Verificar se o slot + duração não ultrapassa horário de fechamento
        AND ts.slot + (v_duration || ' minutes')::INTERVAL <= '20:00'::TIME
    )
    SELECT
        check_date,
        slot,
        check_date = CURRENT_DATE as is_today,
        day_offset
    FROM available_slots
    ORDER BY check_date, slot
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar view para agenda semanal
CREATE OR REPLACE VIEW weekly_schedule AS
WITH week_dates AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '6 days',
        '1 day'::INTERVAL
    )::DATE as date
)
SELECT
    wd.date,
    TO_CHAR(wd.date, 'Day') as day_name,
    s.id as salon_id,
    s.name as salon_name,
    p.id as professional_id,
    p.name as professional_name,
    COUNT(a.id) as total_appointments,
    COUNT(a.id) FILTER (WHERE a.status = 'confirmed') as confirmed_count,
    COUNT(a.id) FILTER (WHERE a.status = 'pending') as pending_count,
    COALESCE(SUM(a.final_price), 0) as total_revenue,
    json_agg(
        json_build_object(
            'id', a.id,
            'time', a.start_time,
            'client', a.client_name,
            'service', srv.name,
            'status', a.status
        ) ORDER BY a.start_time
    ) FILTER (WHERE a.id IS NOT NULL) as appointments
FROM week_dates wd
CROSS JOIN salons s
CROSS JOIN professionals p
LEFT JOIN appointments a ON
    a.date = wd.date AND
    a.salon_id = s.id AND
    a.professional_id = p.id AND
    a.status NOT IN ('cancelled', 'no_show')
LEFT JOIN services srv ON srv.id = a.service_id
WHERE p.salon_id = s.id
  AND p.is_active = true
GROUP BY wd.date, s.id, s.name, p.id, p.name
ORDER BY wd.date, p.name;

-- 5. Criar função para validar disponibilidade antes de criar agendamento
CREATE OR REPLACE FUNCTION validate_appointment_availability(
    p_salon_id UUID,
    p_professional_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_end_time TIME;
    v_conflicts INTEGER;
    v_result JSON;
BEGIN
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Verificar conflitos
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments
    WHERE salon_id = p_salon_id
      AND professional_id = p_professional_id
      AND date = p_date
      AND status NOT IN ('cancelled', 'no_show')
      AND (
          (p_start_time >= start_time AND p_start_time < end_time)
          OR
          (v_end_time > start_time AND v_end_time <= end_time)
          OR
          (p_start_time <= start_time AND v_end_time >= end_time)
      );

    v_result := json_build_object(
        'is_available', v_conflicts = 0,
        'conflicts', v_conflicts,
        'start_time', p_start_time,
        'end_time', v_end_time
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários
COMMENT ON FUNCTION get_schedule_grid(UUID, UUID, DATE) IS 'Gera grade de horários com disponibilidade';
COMMENT ON FUNCTION get_day_summary(UUID, DATE) IS 'Retorna resumo do dia com estatísticas';
COMMENT ON FUNCTION suggest_next_available_slot(UUID, UUID, UUID, DATE) IS 'Sugere próximos horários disponíveis';
COMMENT ON FUNCTION validate_appointment_availability(UUID, UUID, DATE, TIME, INTEGER) IS 'Valida se horário está disponível';

-- =====================================================
-- SUCESSO! Melhorias na agenda implementadas
-- =====================================================

SELECT 'Melhorias na visualização da agenda criadas com sucesso!' as message;
