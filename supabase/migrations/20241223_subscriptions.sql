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
