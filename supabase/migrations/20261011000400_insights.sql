BEGIN;
-- SysHair Insights: relatórios administrativos pelo WhatsApp.
-- Fonte de faturamento = atendimentos concluídos (final_price) + pagamentos avulsos pagos.
-- Pendentes/confirmados entram só como receita prevista.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS insights_category text
  CHECK (insights_category IN ('corte','barba','combo','quimica','estetica','outro'));

-- Sugestão inicial por nome; dono pode corrigir. Combos com corte contam como corte também.
UPDATE public.services s SET insights_category = CASE
  WHEN n.k ~ '(corte|cabelo).*(barba|sobrancel|sombrancel|pezinho)|(barba|sobrancel|sombrancel).*corte' THEN 'combo'
  WHEN n.k ~ 'corte|cabelo' THEN 'corte'
  WHEN n.k ~ 'barba' THEN 'barba'
  WHEN n.k ~ 'progressiv|escova|tintura|luzes|mecha|quimic|relaxamento|alisamento|coloracao' THEN 'quimica'
  WHEN n.k ~ 'sobrancel|sombrancel|manicure|pedicure|unha|depila|limpeza|maquiag' THEN 'estetica'
  ELSE 'outro' END
FROM (SELECT id, lower(translate(name,'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ','aaaaeeiooooucaaaaeeiooouc')) AS k FROM public.services) n
WHERE s.id = n.id AND s.insights_category IS NULL;

CREATE TABLE IF NOT EXISTS public.insights_settings (
  salon_id uuid PRIMARY KEY REFERENCES public.salons(id) ON DELETE CASCADE,
  weekly_enabled boolean NOT NULL DEFAULT false,
  monthly_enabled boolean NOT NULL DEFAULT false,
  yearly_enabled boolean NOT NULL DEFAULT false,
  alerts_enabled boolean NOT NULL DEFAULT false,
  weekly_day smallint NOT NULL DEFAULT 1 CHECK (weekly_day BETWEEN 0 AND 6), -- 0=domingo
  send_time time NOT NULL DEFAULT '08:00',
  show_professional_ranking boolean NOT NULL DEFAULT true,
  alert_drop_pct integer NOT NULL DEFAULT 30 CHECK (alert_drop_pct BETWEEN 10 AND 90),
  alert_growth_pct integer NOT NULL DEFAULT 40 CHECK (alert_growth_pct BETWEEN 10 AND 300),
  alert_cancel_rate_pct integer NOT NULL DEFAULT 25 CHECK (alert_cancel_rate_pct BETWEEN 5 AND 90),
  alert_cooldown_days integer NOT NULL DEFAULT 7 CHECK (alert_cooldown_days BETWEEN 1 AND 60),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Destinatário administrativo só recebe dados financeiros após verificar posse do número.
CREATE TABLE IF NOT EXISTS public.insights_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, phone)
);

CREATE TABLE IF NOT EXISTS whatsapp_private.insights_verification (
  recipient_id uuid PRIMARY KEY REFERENCES public.insights_recipients(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON whatsapp_private.insights_verification FROM PUBLIC, anon, authenticated;
GRANT ALL ON whatsapp_private.insights_verification TO service_role;

-- Histórico + idempotência: um relatório por salão/destinatário/tipo/período.
CREATE TABLE IF NOT EXISTS public.insights_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.insights_recipients(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('weekly','monthly','yearly','alert','on_demand','test')),
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end > period_start),
  dedupe_key text NOT NULL,
  metrics jsonb NOT NULL,
  message text NOT NULL,
  outbox_id uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','skipped','failed')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS insights_reports_salon_created ON public.insights_reports(salon_id, created_at DESC);

ALTER TABLE public.insights_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_private.insights_verification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner insights settings" ON public.insights_settings;
CREATE POLICY "Owner insights settings" ON public.insights_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner reads recipients" ON public.insights_recipients;
CREATE POLICY "Owner reads recipients" ON public.insights_recipients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner reads reports" ON public.insights_reports;
CREATE POLICY "Owner reads reports" ON public.insights_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salons s WHERE s.id = salon_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Worker insights" ON public.insights_settings;
CREATE POLICY "Worker insights" ON public.insights_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Worker recipients" ON public.insights_recipients;
CREATE POLICY "Worker recipients" ON public.insights_recipients FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Worker reports" ON public.insights_reports;
CREATE POLICY "Worker reports" ON public.insights_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Worker verification" ON whatsapp_private.insights_verification;
CREATE POLICY "Worker verification" ON whatsapp_private.insights_verification FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.insights_settings TO authenticated;
-- Destinatários e histórico são escritos só pela Edge Function (verificação de posse do número).
REVOKE INSERT, UPDATE, DELETE ON public.insights_recipients FROM authenticated;
GRANT SELECT ON public.insights_recipients, public.insights_reports TO authenticated;
GRANT ALL ON public.insights_settings, public.insights_recipients, public.insights_reports TO service_role;

-- Atualização da categoria do serviço pelo dono passa pelas policies existentes de services.

-- Métricas de um período fechado [p_start, p_end) no calendário do salão.
CREATE OR REPLACE FUNCTION public.insights_metrics(p_salon_id uuid, p_start date, p_end date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
WITH appt AS (
  SELECT a.*, coalesce(sv.insights_category,'outro') AS cat, sv.name AS service_name, pr.name AS professional_name
  FROM appointments a
  LEFT JOIN services sv ON sv.id=a.service_id AND sv.salon_id=a.salon_id
  LEFT JOIN professionals pr ON pr.id=a.professional_id AND pr.salon_id=a.salon_id
  WHERE a.salon_id=p_salon_id AND a.date>=p_start AND a.date<p_end
),
done AS (SELECT * FROM appt WHERE status='completed'),
paid_extra AS (
  SELECT coalesce(sum(p.amount),0) AS v FROM payments p
  WHERE p.salon_id=p_salon_id AND p.appointment_id IS NULL AND p.payment_status IN ('paid','approved','completed')
    AND (p.paid_at AT TIME ZONE (SELECT timezone FROM salons WHERE id=p_salon_id))::date >= p_start
    AND (p.paid_at AT TIME ZONE (SELECT timezone FROM salons WHERE id=p_salon_id))::date < p_end
),
first_visit AS (
  SELECT coalesce(a.client_id::text, a.client_phone) AS who, min(a.date) AS first_date
  FROM appointments a WHERE a.salon_id=p_salon_id AND a.status='completed' AND coalesce(a.client_id::text, a.client_phone) IS NOT NULL
  GROUP BY 1
),
by_dow AS (SELECT extract(dow FROM date)::int AS dow, count(*) n FROM done GROUP BY 1),
by_hour AS (SELECT extract(hour FROM start_time)::int AS h, count(*) n FROM done GROUP BY 1),
by_service AS (SELECT service_name AS name, cat, count(*) n FROM done GROUP BY 1,2),
by_pro AS (SELECT professional_name AS name, count(*) n FROM done WHERE professional_name IS NOT NULL GROUP BY 1)
SELECT jsonb_build_object(
  'start', p_start, 'end_exclusive', p_end,
  'completed', (SELECT count(*) FROM done),
  'scheduled_total', (SELECT count(*) FROM appt),
  'cuts', (SELECT count(*) FROM done WHERE cat IN ('corte','combo')),
  'cancelled', (SELECT count(*) FROM appt WHERE status='cancelled'),
  'no_show', (SELECT count(*) FROM appt WHERE status='no_show'),
  'open', (SELECT count(*) FROM appt WHERE status IN ('pending','confirmed')),
  'revenue', (SELECT coalesce(sum(final_price),0) FROM done) + (SELECT v FROM paid_extra),
  'expected_revenue', (SELECT coalesce(sum(final_price),0) FROM appt WHERE status IN ('pending','confirmed')),
  'unique_clients', (SELECT count(DISTINCT coalesce(client_id::text, client_phone)) FROM done),
  'new_clients', (SELECT count(*) FROM first_visit WHERE first_date>=p_start AND first_date<p_end),
  'unclassified_services', (SELECT count(*) FROM done WHERE cat='outro'),
  'by_dow', coalesce((SELECT jsonb_agg(jsonb_build_object('dow',dow,'n',n) ORDER BY n DESC, dow) FROM by_dow),'[]'),
  'by_hour', coalesce((SELECT jsonb_agg(jsonb_build_object('hour',h,'n',n) ORDER BY n DESC, h) FROM by_hour),'[]'),
  'by_service', coalesce((SELECT jsonb_agg(jsonb_build_object('name',name,'cat',cat,'n',n) ORDER BY n DESC, name) FROM by_service),'[]'),
  'top_professional', (SELECT name FROM by_pro ORDER BY n DESC, name LIMIT 1),
  'by_month', CASE WHEN p_end - p_start > 62 THEN coalesce((SELECT jsonb_agg(jsonb_build_object('month',m,'n',n,'revenue',r) ORDER BY m) FROM (SELECT to_char(date,'YYYY-MM') m, count(*) n, sum(final_price) r FROM done GROUP BY 1) x),'[]') ELSE NULL END,
  'first_data_date', (SELECT min(date) FROM appointments WHERE salon_id=p_salon_id)
);
$$;
REVOKE ALL ON FUNCTION public.insights_metrics(uuid,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_metrics(uuid,date,date) TO service_role;

-- Ocupação de um dia da semana: média das últimas N ocorrências (para alerta de baixa ocupação).
CREATE OR REPLACE FUNCTION public.insights_dow_history(p_salon_id uuid, p_until date, p_weeks int DEFAULT 4)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'dow', extract(dow FROM d)::int, 'n',
  (SELECT count(*) FROM appointments a WHERE a.salon_id=p_salon_id AND a.date=d::date AND a.status IN ('completed','confirmed','pending'))) ORDER BY d), '[]')
FROM generate_series(p_until - (p_weeks*7), p_until - 1, interval '1 day') d;
$$;
REVOKE ALL ON FUNCTION public.insights_dow_history(uuid,date,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_dow_history(uuid,date,int) TO service_role;

-- Verificação por código enviado ao próprio número; 5 tentativas, expira em 15 min.
CREATE OR REPLACE FUNCTION public.insights_check_code(p_recipient_id uuid, p_code_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$ DECLARE v whatsapp_private.insights_verification; BEGIN
  SELECT * INTO v FROM whatsapp_private.insights_verification WHERE recipient_id=p_recipient_id FOR UPDATE;
  IF NOT FOUND OR v.expires_at<now() OR v.attempts>=5 THEN RETURN false; END IF;
  IF v.code_hash<>p_code_hash THEN
    UPDATE whatsapp_private.insights_verification SET attempts=attempts+1 WHERE recipient_id=p_recipient_id;
    RETURN false;
  END IF;
  UPDATE public.insights_recipients SET verified_at=now() WHERE id=p_recipient_id;
  DELETE FROM whatsapp_private.insights_verification WHERE recipient_id=p_recipient_id;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.insights_set_code(p_recipient_id uuid, p_code_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,whatsapp_private
AS $$ INSERT INTO whatsapp_private.insights_verification(recipient_id,code_hash,attempts,expires_at)
  VALUES(p_recipient_id,p_code_hash,0,now()+interval '15 minutes')
  ON CONFLICT(recipient_id) DO UPDATE SET code_hash=EXCLUDED.code_hash,attempts=0,expires_at=EXCLUDED.expires_at $$;
REVOKE ALL ON FUNCTION public.insights_check_code(uuid,text), public.insights_set_code(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insights_check_code(uuid,text), public.insights_set_code(uuid,text) TO service_role;

-- Cron: verifica a cada 15 min quais relatórios estão vencidos no fuso de cada salão.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='insights-reports';
  PERFORM cron.schedule('insights-reports', '*/15 * * * *', $c$SELECT public.invoke_edge_function('insights-reports')$c$);
END $$;
COMMIT;
