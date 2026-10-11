BEGIN;
-- Evolução da função existente: mesmo contrato, agora no fuso do salão.
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
  v_now         timestamp;
  v_result      text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF NOT FOUND THEN RETURN v_result; END IF;
  v_now := now() AT TIME ZONE v_salon.timezone;
  IF p_date < v_now::date THEN
    RETURN v_result;
  END IF;

  SELECT duration_minutes INTO v_duration
    FROM services WHERE id = p_service_id AND salon_id = p_salon_id AND COALESCE(is_active,true);
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

  -- Pausa de almoÃ§o
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

-- Proteção de todos os caminhos de escrita. Lock por salão/dia serializa também troca de profissional.
CREATE OR REPLACE FUNCTION public.whatsapp_validate_appointment()
RETURNS trigger LANGUAGE plpgsql SET search_path=public
AS $$
DECLARE v_duration integer; v_price numeric; v_timezone text; v_old_key bigint; v_new_key bigint; v_key bigint;
 v_sched_changed boolean; v_untrusted boolean;
BEGIN
 IF TG_OP='UPDATE' AND NEW.salon_id IS DISTINCT FROM OLD.salon_id THEN RAISE EXCEPTION 'appointment_tenant_immutable'; END IF;
 -- Mudança só de status/pagamento/notas em agendamento antigo não pode falhar por serviço desativado ou duração alterada.
 v_sched_changed := TG_OP='INSERT' OR NEW.date IS DISTINCT FROM OLD.date OR NEW.start_time IS DISTINCT FROM OLD.start_time
   OR NEW.end_time IS DISTINCT FROM OLD.end_time OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
   OR NEW.service_id IS DISTINCT FROM OLD.service_id OR NEW.client_id IS DISTINCT FROM OLD.client_id;
 IF NOT v_sched_changed AND NOT (NEW.status IN('pending','confirmed') AND OLD.status NOT IN('pending','confirmed')) THEN RETURN NEW; END IF;
 -- Equipe autenticada pode encaixar fora da grade; booking público (anon) e bot seguem a grade oficial.
 v_untrusted := coalesce(auth.role(),'anon')='anon' OR NEW.whatsapp_request_key IS NOT NULL;
 IF v_sched_changed THEN
  IF NEW.client_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM clients WHERE id=NEW.client_id AND salon_id=NEW.salon_id) THEN RAISE EXCEPTION 'invalid_client'; END IF;
  IF NEW.professional_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM professionals WHERE id=NEW.professional_id AND salon_id=NEW.salon_id) THEN RAISE EXCEPTION 'invalid_professional'; END IF;
  IF NEW.end_time IS NOT NULL AND NEW.end_time<=NEW.start_time THEN RAISE EXCEPTION 'invalid_duration'; END IF;
  IF v_untrusted THEN
   SELECT duration_minutes,price INTO v_duration,v_price FROM services WHERE id=NEW.service_id AND salon_id=NEW.salon_id AND coalesce(is_active,true);
   IF NOT FOUND OR v_duration<=0 THEN RAISE EXCEPTION 'invalid_service'; END IF;
   IF NEW.professional_id IS NULL OR NOT EXISTS(SELECT 1 FROM professionals WHERE id=NEW.professional_id AND salon_id=NEW.salon_id AND coalesce(is_active,true)) THEN RAISE EXCEPTION 'invalid_professional'; END IF;
   IF NEW.end_time IS NULL OR NEW.end_time<>NEW.start_time+make_interval(mins=>v_duration) THEN RAISE EXCEPTION 'invalid_duration'; END IF;
  END IF;
 END IF;
 v_new_key:=hashtextextended(NEW.salon_id::text||':'||NEW.date::text,0);
 IF TG_OP='UPDATE' THEN v_old_key:=hashtextextended(OLD.salon_id::text||':'||OLD.date::text,0); ELSE v_old_key:=v_new_key; END IF;
 FOR v_key IN SELECT DISTINCT k FROM unnest(ARRAY[v_old_key,v_new_key]) k ORDER BY k LOOP PERFORM pg_advisory_xact_lock(v_key); END LOOP;
 IF NEW.status IN('pending','confirmed') AND NEW.professional_id IS NOT NULL AND NEW.end_time IS NOT NULL THEN
  IF v_untrusted AND (TG_OP='INSERT' OR NEW.date IS DISTINCT FROM OLD.date OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.professional_id IS DISTINCT FROM OLD.professional_id OR NEW.service_id IS DISTINCT FROM OLD.service_id OR (OLD.status NOT IN('pending','confirmed'))) THEN
   IF NOT to_char(NEW.start_time,'HH24:MI')=ANY(public.get_available_time_slots(NEW.salon_id,NEW.professional_id,NEW.service_id,NEW.date,NEW.id)) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  END IF;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.date IS DISTINCT FROM OLD.date OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN
   IF EXISTS(SELECT 1 FROM appointments a WHERE a.id<>NEW.id AND a.salon_id=NEW.salon_id AND a.date=NEW.date AND a.status IN('pending','confirmed') AND a.professional_id=NEW.professional_id AND NEW.start_time<a.end_time AND NEW.end_time>a.start_time) THEN RAISE EXCEPTION 'slot_conflict'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS whatsapp_validate_appointment ON public.appointments;
CREATE TRIGGER whatsapp_validate_appointment BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_validate_appointment();

-- Mutação do bot somente para identidade derivada de inbound autenticado. Modelo não recebe SQL/tenant arbitrário.
CREATE OR REPLACE FUNCTION public.whatsapp_book_appointment(
 p_event_id uuid,p_service_id uuid,p_professional_id uuid,p_date date,p_start time,p_client_name text,p_request_key text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE e whatsapp_webhook_events; v_id uuid; v_client uuid; v_duration integer; v_price numeric; v_key text;
BEGIN
 SELECT * INTO e FROM whatsapp_webhook_events WHERE id=p_event_id AND status='processing';
 IF NOT FOUND THEN RAISE EXCEPTION 'event_missing'; END IF;
 IF length(p_client_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid_client_name'; END IF;
 v_key:='booking:'||e.salon_id::text||':'||e.sender_phone||':'||p_request_key;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_key,0));
 SELECT id INTO v_id FROM appointments WHERE whatsapp_request_key=v_key;
 IF FOUND THEN RETURN v_id; END IF;
 SELECT id INTO v_client FROM clients WHERE salon_id=e.salon_id AND phone_normalized=e.sender_phone ORDER BY created_at LIMIT 1;
 SELECT duration_minutes,price INTO v_duration,v_price FROM services WHERE id=p_service_id AND salon_id=e.salon_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid_service'; END IF;
 INSERT INTO appointments(salon_id,service_id,professional_id,client_id,client_name,client_phone,date,start_time,end_time,status,price,final_price,whatsapp_request_key)
 VALUES(e.salon_id,p_service_id,p_professional_id,v_client,p_client_name,e.sender_phone,p_date,p_start,p_start+make_interval(mins=>v_duration),'pending',v_price,v_price,v_key) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_change_appointment(p_event_id uuid,p_appointment_id uuid,p_action text,p_date date DEFAULT NULL,p_start time DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE e whatsapp_webhook_events; a appointments; v_duration integer; v_timezone text; BEGIN
 SELECT * INTO e FROM whatsapp_webhook_events WHERE id=p_event_id AND status='processing';
 IF NOT FOUND THEN RAISE EXCEPTION 'event_missing'; END IF;
 SELECT * INTO a FROM appointments WHERE id=p_appointment_id AND salon_id=e.salon_id AND client_phone=e.sender_phone FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'appointment_missing'; END IF;
 IF a.status NOT IN('pending','confirmed') THEN RETURN a.status::text; END IF;
 SELECT timezone INTO v_timezone FROM salons WHERE id=a.salon_id;
 -- Regra efetiva mais restritiva existente: 24 horas. Não relaxar para aviso antigo de 2 horas.
 IF (a.date+a.start_time) AT TIME ZONE v_timezone<=now()+interval '24 hours' THEN RAISE EXCEPTION 'change_deadline'; END IF;
 IF p_action='cancel' THEN UPDATE appointments SET status='cancelled' WHERE id=a.id;
 ELSIF p_action='reschedule' THEN
  SELECT duration_minutes INTO v_duration FROM services WHERE id=a.service_id AND salon_id=a.salon_id;
  UPDATE appointments SET date=p_date,start_time=p_start,end_time=p_start+make_interval(mins=>v_duration) WHERE id=a.id;
 ELSE RAISE EXCEPTION 'invalid_action'; END IF;
 RETURN CASE WHEN p_action='cancel' THEN 'cancelled' ELSE a.status::text END;
END $$;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_request_key text;
CREATE UNIQUE INDEX appointments_whatsapp_request_key ON public.appointments(whatsapp_request_key) WHERE whatsapp_request_key IS NOT NULL;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('whatsapp_book_appointment','whatsapp_change_appointment') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;

