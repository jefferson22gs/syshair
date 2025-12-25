-- =============================================
-- SYSHAIR - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Create ENUM types
CREATE TYPE public.user_role AS ENUM ('admin', 'professional', 'client');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'fixed');

-- =============================================
-- 2. PROFILES TABLE (linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. USER ROLES TABLE (separate for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  salon_id UUID, -- Will be linked after salons table is created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, salon_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check user role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's salon_id
CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- 4. SALONS TABLE
-- =============================================
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_name TEXT,
  cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '19:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Add foreign key to user_roles now that salons exists
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_salon_id_fkey 
  FOREIGN KEY (salon_id) REFERENCES public.salons(id) ON DELETE CASCADE;

CREATE POLICY "Owners can view their salons"
  ON public.salons FOR SELECT
  USING (owner_id = auth.uid() OR public.get_user_salon_id(auth.uid()) = id);

CREATE POLICY "Owners can update their salons"
  ON public.salons FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create salons"
  ON public.salons FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- =============================================
-- 5. PROFESSIONALS TABLE
-- =============================================
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "19:00"}',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon members can view professionals"
  ON public.professionals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR public.get_user_salon_id(auth.uid()) = salon_id
  );

CREATE POLICY "Salon owners can manage professionals"
  ON public.professionals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
  );

-- =============================================
-- 6. SERVICES TABLE
-- =============================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public can view services for booking
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Salon owners can manage services"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
  );

-- =============================================
-- 7. PROFESSIONAL_SERVICES (many-to-many)
-- =============================================
CREATE TABLE public.professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price DECIMAL(10,2),
  custom_duration INTEGER,
  UNIQUE(professional_id, service_id)
);

ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view professional services"
  ON public.professional_services FOR SELECT
  USING (true);

CREATE POLICY "Salon owners can manage professional services"
  ON public.professional_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals p
      JOIN public.salons s ON s.id = p.salon_id
      WHERE p.id = professional_id AND s.owner_id = auth.uid()
    )
  );

-- =============================================
-- 8. CLIENTS TABLE
-- =============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  preferences JSONB DEFAULT '{}',
  last_visit_at TIMESTAMPTZ,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon members can view clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR public.get_user_salon_id(auth.uid()) = salon_id
  );

CREATE POLICY "Salon owners can manage clients"
  ON public.clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as clients"
  ON public.clients FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 9. COUPONS TABLE
-- =============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type coupon_type NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_new_clients_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salon_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active coupons to apply them
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Salon owners can manage coupons"
  ON public.coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
  );

-- =============================================
-- 10. APPOINTMENTS TABLE
-- =============================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  client_name TEXT,
  client_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_appointments_date ON public.appointments(salon_id, date);
CREATE INDEX idx_appointments_professional ON public.appointments(professional_id, date);

CREATE POLICY "Salon members can view appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.professionals 
      WHERE id = professional_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = client_id AND user_id = auth.uid()
    )
    OR public.get_user_salon_id(auth.uid()) = salon_id
  );

CREATE POLICY "Salon owners can manage appointments"
  ON public.appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.salons 
      WHERE id = salon_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 11. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
-- Subscription Management Tables for SysHair
-- Run this in Supabase SQL Editor

-- Table to store subscription information
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mercado Pago fields
  mp_preapproval_id TEXT, -- Mercado Pago subscription ID
  mp_payer_id TEXT,
  mp_external_reference TEXT,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, pending, cancelled, expired, blocked
  plan_id TEXT DEFAULT 'syshair-premium',
  plan_name TEXT DEFAULT 'SysHair Premium',
  
  -- Pricing
  amount DECIMAL(10,2) DEFAULT 39.90,
  currency TEXT DEFAULT 'BRL',
  
  -- Trial period
  trial_start_date TIMESTAMPTZ DEFAULT NOW(),
  trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  is_trial BOOLEAN DEFAULT true,
  
  -- Subscription dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store payment history
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
  
  -- Mercado Pago payment fields
  mp_payment_id TEXT,
  mp_status TEXT, -- approved, pending, rejected, refunded
  mp_status_detail TEXT,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT, -- credit_card, debit_card, pix, boleto
  
  -- Dates
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_salon_id ON public.subscriptions(salon_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_preapproval ON public.subscriptions(mp_preapproval_id);

-- Function to check if subscription is active or in trial
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_salon_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE salon_id = p_salon_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if in valid trial period
  IF v_subscription.is_trial AND v_subscription.trial_end_date > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if subscription is active
  IF v_subscription.status = 'active' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription status details
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_salon_id UUID)
RETURNS JSON AS $$
DECLARE
  v_subscription RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE salon_id = p_salon_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_subscription IS NULL THEN
    RETURN json_build_object(
      'has_subscription', FALSE,
      'status', 'none',
      'is_active', FALSE,
      'days_remaining', 0
    );
  END IF;
  
  -- Calculate days remaining in trial
  IF v_subscription.is_trial THEN
    v_result := json_build_object(
      'has_subscription', TRUE,
      'status', v_subscription.status,
      'is_trial', TRUE,
      'is_active', v_subscription.trial_end_date > NOW(),
      'trial_end_date', v_subscription.trial_end_date,
      'days_remaining', GREATEST(0, EXTRACT(DAY FROM v_subscription.trial_end_date - NOW())::INTEGER)
    );
  ELSE
    v_result := json_build_object(
      'has_subscription', TRUE,
      'status', v_subscription.status,
      'is_trial', FALSE,
      'is_active', v_subscription.status = 'active',
      'current_period_end', v_subscription.current_period_end,
      'next_payment_date', v_subscription.next_payment_date
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own payments
CREATE POLICY "Users can view own payments" ON public.subscription_payments
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all (for webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage payments" ON public.subscription_payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
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
-- Add loyalty_points column to clients table for loyalty program
-- Clients earn points based on amount spent (1 real = 1 point)

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- Add loyalty_level computed based on points
-- Bronze: 0-499
-- Prata: 500-999  
-- Ouro: 1000-2499
-- Diamante: 2500+

COMMENT ON COLUMN public.clients.loyalty_points IS 'Pontos de fidelidade acumulados pelo cliente';
-- ============================================
-- BACKEND SUPABASE - SISTEMA DE NOTIFICAÇÕES
-- ============================================

-- 1. Adicionar coluna loyalty_points (se não existir)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- 2. Tabela para armazenar notificações enviadas
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'review_request', 'marketing', 'reminder', 'birthday'
  channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'push', 'email'
  title TEXT,
  message TEXT NOT NULL,
  phone VARCHAR(20), -- Telefone do destinatário
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'scheduled'
  scheduled_for TIMESTAMPTZ, -- Quando deve ser enviada
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_notifications_salon ON public.notifications(salon_id);

-- RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage notifications" ON public.notifications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = notifications.salon_id AND salons.owner_id = auth.uid()
  ));

-- 3. Função para agendar notificação de review 1h após serviço concluído
CREATE OR REPLACE FUNCTION schedule_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'completed', agendar notificação para daqui 1 hora
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.notifications (
      salon_id,
      appointment_id,
      type,
      channel,
      title,
      message,
      phone,
      status,
      scheduled_for
    )
    VALUES (
      NEW.salon_id,
      NEW.id,
      'review_request',
      'whatsapp',
      'Avalie seu atendimento',
      'Olá ' || COALESCE(split_part(NEW.client_name, ' ', 1), 'Cliente') || '! 🌟 Como foi sua experiência conosco? Adoraríamos saber sua opinião!',
      NEW.client_phone,
      'scheduled',
      NOW() + INTERVAL '1 hour'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se existir (para poder recriar)
DROP TRIGGER IF EXISTS on_appointment_completed ON public.appointments;

-- Criar trigger
CREATE TRIGGER on_appointment_completed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_review_notification();

-- 4. Função para agendar lembrete de aniversário
CREATE OR REPLACE FUNCTION check_birthday_notifications()
RETURNS void AS $$
DECLARE
  client_record RECORD;
  birthday_date TEXT;
  client_birthday DATE;
BEGIN
  -- Buscar clientes que fazem aniversário hoje
  FOR client_record IN 
    SELECT c.*, s.name as salon_name, s.id as salon_id
    FROM clients c
    JOIN salons s ON s.id = c.salon_id
    WHERE c.notes LIKE '%Aniversário:%'
  LOOP
    -- Extrair data de nascimento do campo notes
    birthday_date := substring(client_record.notes from 'Aniversário: ([0-9]{2}/[0-9]{2}/[0-9]{4})');
    
    IF birthday_date IS NOT NULL THEN
      -- Verificar se é hoje (comparar dia/mês)
      IF to_char(CURRENT_DATE, 'DD/MM') = substring(birthday_date, 1, 5) THEN
        -- Verificar se já não enviamos hoje
        IF NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE client_id = client_record.id 
          AND type = 'birthday'
          AND DATE(created_at) = CURRENT_DATE
        ) THEN
          INSERT INTO public.notifications (
            salon_id,
            client_id,
            type,
            channel,
            title,
            message,
            phone,
            status
          )
          VALUES (
            client_record.salon_id,
            client_record.id,
            'birthday',
            'whatsapp',
            'Feliz Aniversário!',
            'Feliz Aniversário, ' || split_part(client_record.name, ' ', 1) || '! 🎂🎉 O ' || client_record.salon_name || ' deseja um dia incrível! Temos um presente especial esperando por você!',
            client_record.phone,
            'pending'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE public.notifications IS 'Tabela para gerenciar notificações enviadas aos clientes';
COMMENT ON FUNCTION schedule_review_notification() IS 'Trigger que agenda notificação de avaliação 1h após serviço concluído';
COMMENT ON FUNCTION check_birthday_notifications() IS 'Função para verificar e criar notificações de aniversário';
