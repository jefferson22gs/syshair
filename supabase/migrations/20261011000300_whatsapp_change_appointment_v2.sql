BEGIN;
-- Remarcação pelo bot: novo horário também respeita antecedência e a grade oficial;
-- update é único (horário antigo só é liberado se o novo for aceito pelo trigger).
CREATE OR REPLACE FUNCTION public.whatsapp_change_appointment(p_event_id uuid,p_appointment_id uuid,p_action text,p_date date DEFAULT NULL,p_start time DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ DECLARE e whatsapp_webhook_events; a appointments; v_duration integer; v_timezone text; BEGIN
 SELECT * INTO e FROM whatsapp_webhook_events WHERE id=p_event_id AND status='processing';
 IF NOT FOUND THEN RAISE EXCEPTION 'event_missing'; END IF;
 SELECT * INTO a FROM appointments WHERE id=p_appointment_id AND salon_id=e.salon_id AND client_phone=e.sender_phone FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'appointment_missing'; END IF;
 IF a.status NOT IN('pending','confirmed') THEN RETURN a.status::text; END IF;
 SELECT timezone INTO v_timezone FROM salons WHERE id=a.salon_id;
 IF (a.date+a.start_time) AT TIME ZONE v_timezone<=now()+interval '24 hours' THEN RAISE EXCEPTION 'change_deadline'; END IF;
 IF p_action='cancel' THEN
  UPDATE appointments SET status='cancelled' WHERE id=a.id;
  RETURN 'cancelled';
 ELSIF p_action='reschedule' THEN
  IF p_date IS NULL OR p_start IS NULL THEN RAISE EXCEPTION 'invalid_request'; END IF;
  IF (p_date+p_start) AT TIME ZONE v_timezone<=now()+interval '24 hours' THEN RAISE EXCEPTION 'change_deadline'; END IF;
  IF NOT to_char(p_start,'HH24:MI')=ANY(public.get_available_time_slots(a.salon_id,a.professional_id,a.service_id,p_date,a.id)) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  SELECT duration_minutes INTO v_duration FROM services WHERE id=a.service_id AND salon_id=a.salon_id;
  IF v_duration IS NULL OR v_duration<=0 THEN RAISE EXCEPTION 'invalid_service'; END IF;
  UPDATE appointments SET date=p_date,start_time=p_start,end_time=p_start+make_interval(mins=>v_duration) WHERE id=a.id;
  RETURN 'rescheduled';
 END IF;
 RAISE EXCEPTION 'invalid_action';
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_change_appointment(uuid,uuid,text,date,time) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_change_appointment(uuid,uuid,text,date,time) TO service_role;
COMMIT;
