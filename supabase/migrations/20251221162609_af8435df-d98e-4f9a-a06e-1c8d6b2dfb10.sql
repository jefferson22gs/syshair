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