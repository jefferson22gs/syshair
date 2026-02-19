-- Migration: Recursos Avançados Completos
-- Cria todas as tabelas necessárias para funcionalidade real

-- ====================================
-- 1. PROGRAMA DE FIDELIDADE
-- ====================================

-- Configurações do programa de fidelidade por salão
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    points_per_real DECIMAL(10,2) DEFAULT 1,
    points_per_referral INTEGER DEFAULT 100,
    points_per_review INTEGER DEFAULT 10,
    birthday_multiplier DECIMAL(3,1) DEFAULT 2.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id)
);

-- Níveis de fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    min_points INTEGER NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    benefits JSONB DEFAULT '[]'::jsonb,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pontos de fidelidade por cliente
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    current_tier_id UUID REFERENCES public.loyalty_tiers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id, client_id)
);

-- Histórico de transações de pontos
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'expired', 'bonus'
    points INTEGER NOT NULL,
    description TEXT,
    reference_id UUID, -- pode referenciar appointment, order, etc.
    reference_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recompensas disponíveis
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'discount', -- 'discount', 'service', 'product', 'gift'
    value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    stock INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resgates de recompensas
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.loyalty_rewards(id),
    points_used INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'used', 'expired', 'cancelled'
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 2. FILA DE ESPERA
-- ====================================

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id),
    client_name VARCHAR(200),
    client_phone VARCHAR(20),
    service_id UUID REFERENCES public.services(id),
    professional_id UUID REFERENCES public.professionals(id),
    preferred_date DATE,
    preferred_time_start TIME,
    preferred_time_end TIME,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'notified', 'scheduled', 'cancelled', 'expired'
    priority INTEGER DEFAULT 0,
    notified_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 3. PROGRAMA DE INDICAÇÕES
-- ====================================

CREATE TABLE IF NOT EXISTS public.referral_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    referrer_reward_type VARCHAR(50) DEFAULT 'points', -- 'points', 'discount', 'credit'
    referrer_reward_value DECIMAL(10,2) DEFAULT 100,
    referee_reward_type VARCHAR(50) DEFAULT 'discount',
    referee_reward_value DECIMAL(10,2) DEFAULT 10,
    min_purchase_for_reward DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id)
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    uses_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id, code)
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    code_id UUID REFERENCES public.referral_codes(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'rewarded', 'cancelled'
    referrer_rewarded_at TIMESTAMPTZ,
    referee_rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 4. LOOKBOOK / GALERIA DE TRABALHOS
-- ====================================

CREATE TABLE IF NOT EXISTS public.lookbook_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id),
    title VARCHAR(200),
    description TEXT,
    image_url TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    service_id UUID REFERENCES public.services(id),
    client_id UUID REFERENCES public.clients(id),
    likes_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lookbook_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lookbook_item_id UUID NOT NULL REFERENCES public.lookbook_items(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id),
    session_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lookbook_item_id, client_id),
    UNIQUE(lookbook_item_id, session_id)
);

-- ====================================
-- 5. METAS E OBJETIVOS
-- ====================================

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'revenue', 'appointments', 'new_clients', 'rating', 'custom'
    name VARCHAR(200) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    period VARCHAR(50) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    professional_id UUID REFERENCES public.professionals(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed', 'cancelled'
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 6. BI ANALYTICS CACHE
-- ====================================

CREATE TABLE IF NOT EXISTS public.analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    new_clients INTEGER DEFAULT 0,
    returning_clients INTEGER DEFAULT 0,
    average_ticket DECIMAL(10,2) DEFAULT 0,
    top_service_id UUID REFERENCES public.services(id),
    top_professional_id UUID REFERENCES public.professionals(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id, date)
);

-- ====================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================

CREATE INDEX IF NOT EXISTS idx_loyalty_points_client ON public.loyalty_points(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON public.loyalty_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date ON public.loyalty_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_salon_status ON public.waitlist(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_lookbook_salon ON public.lookbook_items(salon_id);
CREATE INDEX IF NOT EXISTS idx_goals_salon_status ON public.goals(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily(salon_id, date);

-- ====================================
-- RLS POLICIES
-- ====================================

-- Habilitar RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbook_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- Policies para donos de salão (CRUD completo)
CREATE POLICY "Salon owners full access" ON public.loyalty_settings FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.loyalty_tiers FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.loyalty_points FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.loyalty_transactions FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.loyalty_rewards FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.loyalty_redemptions FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.waitlist FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.referral_settings FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.referral_codes FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.referrals FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.lookbook_items FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Public can view lookbook" ON public.lookbook_items FOR SELECT USING (is_public = true);

CREATE POLICY "Anyone can like" ON public.lookbook_likes FOR INSERT WITH CHECK (true);

CREATE POLICY "Salon owners full access" ON public.goals FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Salon owners full access" ON public.analytics_daily FOR ALL USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

-- ====================================
-- DADOS INICIAIS PADRÃO
-- ====================================

-- Inserir níveis de fidelidade padrão para salões existentes
INSERT INTO public.loyalty_tiers (salon_id, name, min_points, discount_percent, icon, color, sort_order)
SELECT 
    s.id,
    tier.name,
    tier.min_points,
    tier.discount_percent,
    tier.icon,
    tier.color,
    tier.sort_order
FROM public.salons s
CROSS JOIN (
    VALUES 
        ('Bronze', 0, 5, 'medal', '#CD7F32', 1),
        ('Prata', 1000, 10, 'medal', '#C0C0C0', 2),
        ('Ouro', 2000, 15, 'trophy', '#FFD700', 3),
        ('Diamante', 4000, 20, 'diamond', '#B9F2FF', 4)
) AS tier(name, min_points, discount_percent, icon, color, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.loyalty_tiers lt WHERE lt.salon_id = s.id
);

-- Inserir configurações de fidelidade padrão
INSERT INTO public.loyalty_settings (salon_id)
SELECT id FROM public.salons
WHERE id NOT IN (SELECT salon_id FROM public.loyalty_settings);

-- Inserir configurações de indicação padrão
INSERT INTO public.referral_settings (salon_id)
SELECT id FROM public.salons
WHERE id NOT IN (SELECT salon_id FROM public.referral_settings);
