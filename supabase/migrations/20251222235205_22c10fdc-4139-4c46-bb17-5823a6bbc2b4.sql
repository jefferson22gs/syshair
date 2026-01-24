-- =============================================
-- SYSHAIR ADVANCED - ALL LAYERS MIGRATION
-- =============================================

-- ============ CAMADA 1-2: INTELIGÊNCIA ============

-- Tabela de insights do salão
CREATE TABLE public.salon_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'idle_hours', 'inactive_clients', 'busy_professional', 'revenue_trend', 'suggestion'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  action_type TEXT, -- 'send_coupon', 'send_reminder', 'adjust_price', etc
  action_data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can view insights" ON public.salon_insights
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = salon_insights.salon_id AND salons.owner_id = auth.uid()
  ));

CREATE POLICY "Salon owners can update insights" ON public.salon_insights
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = salon_insights.salon_id AND salons.owner_id = auth.uid()
  ));

-- Tabela de métricas de cliente
CREATE TABLE public.client_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  total_appointments INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  avg_days_between_visits NUMERIC,
  last_visit_date DATE,
  predicted_next_visit DATE,
  ltv NUMERIC DEFAULT 0, -- Lifetime Value
  churn_risk TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  preferred_day_of_week INTEGER, -- 0-6
  preferred_time TEXT,
  preferred_professional_id UUID REFERENCES public.professionals(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can view client metrics" ON public.client_metrics
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = client_metrics.salon_id AND salons.owner_id = auth.uid()
  ));

-- ============ CAMADA 3: PAGAMENTOS & PACOTES ============

-- Planos de assinatura do salão
CREATE TABLE public.salon_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'basic', 'premium', 'enterprise'
  features JSONB DEFAULT '{}',
  price_monthly NUMERIC DEFAULT 0,
  max_professionals INTEGER DEFAULT 1,
  max_services INTEGER DEFAULT 5,
  white_label_enabled BOOLEAN DEFAULT false,
  custom_domain TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage plans" ON public.salon_plans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = salon_plans.salon_id AND salons.owner_id = auth.uid()
  ));

-- Pacotes de serviços
CREATE TABLE public.service_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  validity_days INTEGER DEFAULT 365,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON public.service_packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Salon owners can manage packages" ON public.service_packages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = service_packages.salon_id AND salons.owner_id = auth.uid()
  ));

-- Créditos do cliente
CREATE TABLE public.client_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  remaining_uses INTEGER NOT NULL DEFAULT 0,
  total_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own credits" ON public.client_credits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = client_credits.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Salon owners can manage credits" ON public.client_credits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = client_credits.salon_id AND salons.owner_id = auth.uid()
  ));

-- Pagamentos / Transações
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'pix', 'credit_card', 'debit_card', 'cash', 'credit'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  payment_type TEXT NOT NULL DEFAULT 'appointment', -- 'appointment', 'package', 'deposit', 'subscription'
  transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can view payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = payments.salon_id AND salons.owner_id = auth.uid()
  ));

CREATE POLICY "Clients can view own payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = payments.client_id AND clients.user_id = auth.uid()
  ));

-- ============ CAMADA 5: EXPERIÊNCIA PREMIUM ============

-- Galeria Antes/Depois
CREATE TABLE public.client_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  before_image_url TEXT,
  after_image_url TEXT,
  description TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'private', -- 'private', 'public', 'link'
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage gallery" ON public.client_gallery
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = client_gallery.salon_id AND salons.owner_id = auth.uid()
  ));

CREATE POLICY "Clients can view own gallery" ON public.client_gallery
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = client_gallery.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Public can view public gallery" ON public.client_gallery
  FOR SELECT USING (visibility = 'public');

-- Avaliações
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  response TEXT, -- Resposta do profissional/salão
  response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public reviews" ON public.reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Clients can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM clients WHERE clients.id = reviews.client_id AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Salon owners can manage reviews" ON public.reviews
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.owner_id = auth.uid()
  ));

-- ============ CAMADA 6-7: MULTI-UNIDADES & MARKETPLACE ============

-- Grupos de salões (Franquias)
CREATE TABLE public.salon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage groups" ON public.salon_groups
  FOR ALL USING (owner_id = auth.uid());

-- Adicionar referência ao grupo no salão
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.salon_groups(id) ON DELETE SET NULL;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT false;

-- Produtos do salão (Marketplace)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Salon owners can manage products" ON public.products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = products.salon_id AND salons.owner_id = auth.uid()
  ));

-- Vendas de produtos
CREATE TABLE public.product_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage sales" ON public.product_sales
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = product_sales.salon_id AND salons.owner_id = auth.uid()
  ));

-- Profissionais autônomos
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS is_autonomous BOOLEAN DEFAULT false;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS portfolio_urls JSONB DEFAULT '[]';

-- ============ FUNÇÕES DE CÁLCULO ============

-- Função para calcular métricas do cliente
CREATE OR REPLACE FUNCTION public.calculate_client_metrics(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon_id UUID;
  v_total_appointments INTEGER;
  v_total_spent NUMERIC;
  v_avg_days NUMERIC;
  v_last_visit DATE;
  v_predicted_next DATE;
  v_ltv NUMERIC;
  v_churn_risk TEXT;
  v_preferred_day INTEGER;
  v_preferred_time TEXT;
  v_preferred_pro UUID;
BEGIN
  -- Get salon_id
  SELECT salon_id INTO v_salon_id FROM clients WHERE id = p_client_id;
  
  -- Calculate total appointments and spent
  SELECT 
    COUNT(*),
    COALESCE(SUM(final_price), 0)
  INTO v_total_appointments, v_total_spent
  FROM appointments 
  WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
    AND status = 'completed';
  
  -- Calculate average days between visits
  WITH visit_dates AS (
    SELECT date, LAG(date) OVER (ORDER BY date) as prev_date
    FROM appointments
    WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
      AND status = 'completed'
    ORDER BY date
  )
  SELECT AVG(date - prev_date)::NUMERIC INTO v_avg_days
  FROM visit_dates WHERE prev_date IS NOT NULL;
  
  -- Get last visit
  SELECT MAX(date) INTO v_last_visit
  FROM appointments 
  WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
    AND status = 'completed';
  
  -- Predict next visit
  IF v_avg_days IS NOT NULL AND v_last_visit IS NOT NULL THEN
    v_predicted_next := v_last_visit + (v_avg_days::INTEGER);
  END IF;
  
  -- Calculate LTV (simple: total spent)
  v_ltv := v_total_spent;
  
  -- Calculate churn risk
  IF v_last_visit IS NULL OR v_last_visit < CURRENT_DATE - 90 THEN
    v_churn_risk := 'high';
  ELSIF v_last_visit < CURRENT_DATE - 45 THEN
    v_churn_risk := 'medium';
  ELSE
    v_churn_risk := 'low';
  END IF;
  
  -- Get preferred day
  SELECT EXTRACT(DOW FROM date)::INTEGER INTO v_preferred_day
  FROM appointments
  WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
    AND status = 'completed'
  GROUP BY EXTRACT(DOW FROM date)
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Get preferred time
  SELECT 
    CASE 
      WHEN EXTRACT(HOUR FROM start_time::TIME) < 12 THEN 'morning'
      WHEN EXTRACT(HOUR FROM start_time::TIME) < 17 THEN 'afternoon'
      ELSE 'evening'
    END INTO v_preferred_time
  FROM appointments
  WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
    AND status = 'completed'
  GROUP BY 1
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Get preferred professional
  SELECT professional_id INTO v_preferred_pro
  FROM appointments
  WHERE (client_id = p_client_id OR client_name = (SELECT name FROM clients WHERE id = p_client_id))
    AND status = 'completed'
  GROUP BY professional_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Upsert metrics
  INSERT INTO client_metrics (
    client_id, salon_id, total_appointments, total_spent, avg_days_between_visits,
    last_visit_date, predicted_next_visit, ltv, churn_risk, preferred_day_of_week,
    preferred_time, preferred_professional_id, updated_at
  ) VALUES (
    p_client_id, v_salon_id, v_total_appointments, v_total_spent, v_avg_days,
    v_last_visit, v_predicted_next, v_ltv, v_churn_risk, v_preferred_day,
    v_preferred_time, v_preferred_pro, now()
  )
  ON CONFLICT (client_id) 
  DO UPDATE SET
    total_appointments = EXCLUDED.total_appointments,
    total_spent = EXCLUDED.total_spent,
    avg_days_between_visits = EXCLUDED.avg_days_between_visits,
    last_visit_date = EXCLUDED.last_visit_date,
    predicted_next_visit = EXCLUDED.predicted_next_visit,
    ltv = EXCLUDED.ltv,
    churn_risk = EXCLUDED.churn_risk,
    preferred_day_of_week = EXCLUDED.preferred_day_of_week,
    preferred_time = EXCLUDED.preferred_time,
    preferred_professional_id = EXCLUDED.preferred_professional_id,
    updated_at = now();
END;
$$;

-- Função para gerar insights do salão
CREATE OR REPLACE FUNCTION public.generate_salon_insights(p_salon_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insight RECORD;
  v_tomorrow DATE := CURRENT_DATE + 1;
  v_idle_count INTEGER;
  v_inactive_count INTEGER;
  v_busy_pro RECORD;
BEGIN
  -- Clear old insights
  DELETE FROM salon_insights 
  WHERE salon_id = p_salon_id 
    AND (expires_at < now() OR is_dismissed = true);

  -- Check for idle hours tomorrow
  SELECT COUNT(*) INTO v_idle_count
  FROM generate_series(9, 18) AS hour
  WHERE NOT EXISTS (
    SELECT 1 FROM appointments 
    WHERE salon_id = p_salon_id 
      AND date = v_tomorrow
      AND EXTRACT(HOUR FROM start_time::TIME) = hour
  );
  
  IF v_idle_count > 3 THEN
    INSERT INTO salon_insights (salon_id, insight_type, title, message, priority, action_type)
    VALUES (
      p_salon_id, 
      'idle_hours', 
      'Horários ociosos amanhã',
      format('Você tem %s horários livres amanhã. Considere enviar uma promoção!', v_idle_count),
      'medium',
      'send_coupon'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for inactive clients (45+ days)
  SELECT COUNT(*) INTO v_inactive_count
  FROM client_metrics 
  WHERE salon_id = p_salon_id 
    AND churn_risk IN ('medium', 'high');
  
  IF v_inactive_count > 0 THEN
    INSERT INTO salon_insights (salon_id, insight_type, title, message, priority, action_type, action_data)
    VALUES (
      p_salon_id,
      'inactive_clients',
      format('%s clientes inativos', v_inactive_count),
      format('Existem %s clientes que não voltam há mais de 45 dias', v_inactive_count),
      'high',
      'send_reminder',
      jsonb_build_object('count', v_inactive_count)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for busy professional
  FOR v_busy_pro IN
    SELECT p.id, p.name, COUNT(*) as apt_count
    FROM appointments a
    JOIN professionals p ON p.id = a.professional_id
    WHERE a.salon_id = p_salon_id
      AND a.date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      AND a.status != 'cancelled'
    GROUP BY p.id, p.name
    HAVING COUNT(*) > 20
  LOOP
    INSERT INTO salon_insights (salon_id, insight_type, title, message, priority, action_data)
    VALUES (
      p_salon_id,
      'busy_professional',
      format('%s com agenda lotada', v_busy_pro.name),
      format('%s tem %s agendamentos esta semana!', v_busy_pro.name, v_busy_pro.apt_count),
      'low',
      jsonb_build_object('professional_id', v_busy_pro.id, 'count', v_busy_pro.apt_count)
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Função para calcular analytics do dashboard
CREATE OR REPLACE FUNCTION public.get_salon_analytics(p_salon_id UUID, p_period TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_result JSONB;
  v_total_revenue NUMERIC;
  v_total_appointments INTEGER;
  v_completed INTEGER;
  v_cancelled INTEGER;
  v_new_clients INTEGER;
  v_avg_ticket NUMERIC;
  v_top_services JSONB;
  v_top_professionals JSONB;
  v_revenue_by_day JSONB;
  v_hourly_distribution JSONB;
BEGIN
  -- Set period
  v_start_date := CASE p_period
    WHEN 'week' THEN CURRENT_DATE - 7
    WHEN 'month' THEN CURRENT_DATE - 30
    WHEN 'quarter' THEN CURRENT_DATE - 90
    WHEN 'year' THEN CURRENT_DATE - 365
    ELSE CURRENT_DATE - 30
  END;
  
  -- Total revenue and appointments
  SELECT 
    COALESCE(SUM(final_price), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total_revenue, v_total_appointments, v_completed, v_cancelled
  FROM appointments
  WHERE salon_id = p_salon_id AND date >= v_start_date;
  
  -- Average ticket
  v_avg_ticket := CASE WHEN v_completed > 0 THEN v_total_revenue / v_completed ELSE 0 END;
  
  -- New clients
  SELECT COUNT(*) INTO v_new_clients
  FROM clients
  WHERE salon_id = p_salon_id AND created_at >= v_start_date;
  
  -- Top services
  SELECT jsonb_agg(row_to_json(t)) INTO v_top_services
  FROM (
    SELECT s.name, COUNT(*) as count, SUM(a.final_price) as revenue
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.salon_id = p_salon_id AND a.date >= v_start_date AND a.status = 'completed'
    GROUP BY s.name
    ORDER BY revenue DESC
    LIMIT 5
  ) t;
  
  -- Top professionals
  SELECT jsonb_agg(row_to_json(t)) INTO v_top_professionals
  FROM (
    SELECT p.name, COUNT(*) as appointments, SUM(a.final_price) as revenue,
           AVG(r.rating) as avg_rating
    FROM appointments a
    JOIN professionals p ON p.id = a.professional_id
    LEFT JOIN reviews r ON r.professional_id = p.id
    WHERE a.salon_id = p_salon_id AND a.date >= v_start_date AND a.status = 'completed'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  ) t;
  
  -- Revenue by day of week
  SELECT jsonb_agg(row_to_json(t)) INTO v_revenue_by_day
  FROM (
    SELECT 
      EXTRACT(DOW FROM date)::INTEGER as day_of_week,
      SUM(final_price) as revenue,
      COUNT(*) as appointments
    FROM appointments
    WHERE salon_id = p_salon_id AND date >= v_start_date AND status = 'completed'
    GROUP BY EXTRACT(DOW FROM date)
    ORDER BY 1
  ) t;
  
  -- Hourly distribution
  SELECT jsonb_agg(row_to_json(t)) INTO v_hourly_distribution
  FROM (
    SELECT 
      EXTRACT(HOUR FROM start_time::TIME)::INTEGER as hour,
      COUNT(*) as count
    FROM appointments
    WHERE salon_id = p_salon_id AND date >= v_start_date
    GROUP BY EXTRACT(HOUR FROM start_time::TIME)
    ORDER BY 1
  ) t;
  
  -- Build result
  v_result := jsonb_build_object(
    'period', p_period,
    'start_date', v_start_date,
    'total_revenue', v_total_revenue,
    'total_appointments', v_total_appointments,
    'completed_appointments', v_completed,
    'cancelled_appointments', v_cancelled,
    'cancellation_rate', CASE WHEN v_total_appointments > 0 THEN (v_cancelled::NUMERIC / v_total_appointments * 100)::NUMERIC(5,2) ELSE 0 END,
    'new_clients', v_new_clients,
    'avg_ticket', v_avg_ticket::NUMERIC(10,2),
    'top_services', COALESCE(v_top_services, '[]'::JSONB),
    'top_professionals', COALESCE(v_top_professionals, '[]'::JSONB),
    'revenue_by_day', COALESCE(v_revenue_by_day, '[]'::JSONB),
    'hourly_distribution', COALESCE(v_hourly_distribution, '[]'::JSONB)
  );
  
  RETURN v_result;
END;
$$;

-- Add unique constraint for client_metrics
ALTER TABLE public.client_metrics ADD CONSTRAINT client_metrics_client_id_key UNIQUE (client_id);

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_salon_date ON appointments(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_date ON appointments(professional_id, date);
CREATE INDEX IF NOT EXISTS idx_client_metrics_salon ON client_metrics(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_insights_salon ON salon_insights(salon_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_payments_salon ON payments(salon_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews(professional_id);