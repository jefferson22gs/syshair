-- Migration: Add Annual Subscription Support
-- Created: 2026-01-04

-- Add plan_type column to subscriptions table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'monthly' 
        CHECK (plan_type IN ('monthly', 'annual'));
    END IF;
END $$;

-- Add annual_price column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'annual_amount'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN annual_amount DECIMAL(10,2) DEFAULT 400.00;
    END IF;
END $$;

-- Update the is_subscription_active function to handle annual subscriptions
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
        -- For annual subscriptions, check if within the year
        IF v_subscription.plan_type = 'annual' THEN
            IF v_subscription.current_period_end IS NOT NULL AND v_subscription.current_period_end > NOW() THEN
                RETURN TRUE;
            ELSIF v_subscription.current_period_end IS NOT NULL AND v_subscription.current_period_end <= NOW() THEN
                -- Annual subscription expired
                RETURN FALSE;
            END IF;
        END IF;
        RETURN TRUE;
    END IF;
    
    -- Check if subscription is blocked (for expired annual)
    IF v_subscription.status = 'blocked' OR v_subscription.status = 'expired' THEN
        RETURN FALSE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_subscription_status to include plan_type info
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_salon_id UUID)
RETURNS JSON AS $$
DECLARE
    v_subscription RECORD;
    v_result JSON;
    v_days_remaining INTEGER;
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
            'days_remaining', 0,
            'plan_type', NULL
        );
    END IF;
    
    -- Calculate days remaining
    IF v_subscription.is_trial THEN
        v_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_subscription.trial_end_date - NOW())::INTEGER);
        v_result := json_build_object(
            'has_subscription', TRUE,
            'status', v_subscription.status,
            'is_trial', TRUE,
            'is_active', v_subscription.trial_end_date > NOW(),
            'trial_end_date', v_subscription.trial_end_date,
            'days_remaining', v_days_remaining,
            'plan_type', v_subscription.plan_type
        );
    ELSIF v_subscription.plan_type = 'annual' THEN
        v_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_subscription.current_period_end - NOW())::INTEGER);
        v_result := json_build_object(
            'has_subscription', TRUE,
            'status', v_subscription.status,
            'is_trial', FALSE,
            'is_active', v_subscription.status = 'active' AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW()),
            'current_period_end', v_subscription.current_period_end,
            'next_payment_date', v_subscription.next_payment_date,
            'plan_type', 'annual',
            'amount', v_subscription.annual_amount,
            'days_remaining', v_days_remaining
        );
    ELSE
        v_result := json_build_object(
            'has_subscription', TRUE,
            'status', v_subscription.status,
            'is_trial', FALSE,
            'is_active', v_subscription.status = 'active',
            'current_period_end', v_subscription.current_period_end,
            'next_payment_date', v_subscription.next_payment_date,
            'plan_type', 'monthly',
            'amount', v_subscription.amount
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block expired annual subscriptions (can be called by cron)
CREATE OR REPLACE FUNCTION public.block_expired_annual_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE public.subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE plan_type = 'annual'
      AND status = 'active'
      AND current_period_end IS NOT NULL
      AND current_period_end <= NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN public.subscriptions.plan_type IS 'Type of subscription: monthly or annual';
COMMENT ON COLUMN public.subscriptions.annual_amount IS 'Price for annual subscription (default R$400.00)';
COMMENT ON FUNCTION public.block_expired_annual_subscriptions() IS 'Blocks expired annual subscriptions. Should be run daily via cron.';
