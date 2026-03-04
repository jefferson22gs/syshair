-- Create ai_provider_keys table
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Only super admins can manage these keys
CREATE POLICY "Super admins can manage AI keys"
    ON public.ai_provider_keys
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'super_admin'
        )
    );

-- Anyone can read active keys (needed for the AI service to work)
-- Or restricted to service role if we handle it only backend side
-- Let's stick to super_admin only for now, and edge functions use service_role
