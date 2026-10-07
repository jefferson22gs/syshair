-- ============================================================
-- get_available_time_slots
-- Usada pela tela /appointment/:token (ManageAppointment) para listar
-- horários livres ao reagendar. Mesma regra do cliente
-- (useSalon.getAvailableTimeSlots): slots a cada duração do serviço,
-- dentro do expediente, sem conflito com agendamentos pending/confirmed.
-- Acrescenta: working_hours por dia, pausa de almoço e horários passados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_salon_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_date date,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon       salons%ROWTYPE;
  v_duration    int;
  v_dow         int := EXTRACT(DOW FROM p_date)::int;
  v_day         jsonb;
  v_open        time;
  v_close       time;
  v_lunch_start time;
  v_lunch_end   time;
  v_slot        time;
  v_slot_end    time;
  v_now         timestamp := now() AT TIME ZONE 'America/Sao_Paulo';
  v_result      text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF NOT FOUND OR p_date < v_now::date THEN
    RETURN v_result;
  END IF;

  SELECT duration_minutes INTO v_duration
    FROM services WHERE id = p_service_id AND salon_id = p_salon_id;
  IF v_duration IS NULL OR v_duration <= 0 THEN
    RETURN v_result;
  END IF;

  -- Expediente do dia: working_hours (por dia) tem prioridade sobre
  -- working_days + opening/closing_time
  v_day := v_salon.working_hours -> v_dow::text;
  IF v_day IS NOT NULL THEN
    IF NOT COALESCE((v_day ->> 'isOpen')::boolean, false) THEN
      RETURN v_result;
    END IF;
    v_open  := COALESCE((v_day ->> 'start')::time, v_salon.opening_time);
    v_close := COALESCE((v_day ->> 'end')::time,   v_salon.closing_time);
  ELSE
    IF v_salon.working_days IS NOT NULL AND NOT (v_dow = ANY (v_salon.working_days)) THEN
      RETURN v_result;
    END IF;
    v_open  := v_salon.opening_time;
    v_close := v_salon.closing_time;
  END IF;

  IF v_open IS NULL OR v_close IS NULL THEN
    RETURN v_result;
  END IF;

  -- Profissional: precisa estar ativo e trabalhar nesse dia
  IF p_professional_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM professionals
     WHERE id = p_professional_id
       AND salon_id = p_salon_id
       AND COALESCE(is_active, true)
       AND (working_days IS NULL OR v_dow = ANY (working_days))
  ) THEN
    RETURN v_result;
  END IF;

  -- Pausa de almoço
  IF COALESCE((v_salon.lunch_break_config ->> 'enabled')::boolean, false)
     AND (v_salon.lunch_break_config -> 'days') @> to_jsonb(v_dow) THEN
    v_lunch_start := (v_salon.lunch_break_config ->> 'start_time')::time;
    v_lunch_end   := (v_salon.lunch_break_config ->> 'end_time')::time;
  END IF;

  v_slot := v_open;
  WHILE v_slot + make_interval(mins => v_duration) <= v_close
        AND v_slot + make_interval(mins => v_duration) > v_slot  -- evita volta da meia-noite
  LOOP
    v_slot_end := v_slot + make_interval(mins => v_duration);

    IF (p_date > v_now::date OR v_slot > v_now::time)
       AND NOT (v_lunch_start IS NOT NULL AND v_slot < v_lunch_end AND v_slot_end > v_lunch_start)
       AND NOT EXISTS (
         SELECT 1 FROM appointments a
          WHERE a.salon_id = p_salon_id
            AND a.date = p_date
            AND a.status IN ('pending', 'confirmed')
            AND (p_professional_id IS NULL OR a.professional_id = p_professional_id)
            AND (p_exclude_appointment_id IS NULL OR a.id <> p_exclude_appointment_id)
            AND v_slot < a.end_time
            AND v_slot_end > a.start_time
       )
    THEN
      v_result := v_result || to_char(v_slot, 'HH24:MI');
    END IF;

    v_slot := v_slot_end;
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_time_slots(uuid, uuid, uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(uuid, uuid, uuid, date, uuid) TO anon, authenticated, service_role;
