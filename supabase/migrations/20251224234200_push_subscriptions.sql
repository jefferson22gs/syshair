-- =============================================
-- PUSH SUBSCRIPTIONS - Para notificações entre dispositivos
-- =============================================

-- Tabela para armazenar subscriptions de push do navegador
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE, -- URL do push service
  p256dh TEXT NOT NULL, -- Public key
  auth TEXT NOT NULL, -- Auth secret
  device_info JSONB DEFAULT '{}', -- userAgent, platform, etc
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_salon ON public.push_subscriptions(salon_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client ON public.push_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir sua subscription (anonimo)
CREATE POLICY "Anyone can insert push subscription" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Donos do salão podem ver as subscriptions
CREATE POLICY "Salon owners can view subscriptions" ON public.push_subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = push_subscriptions.salon_id AND salons.owner_id = auth.uid()
  ));

-- Usuários podem atualizar/deletar suas próprias subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid() OR client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  ));

COMMENT ON TABLE public.push_subscriptions IS 'Armazena subscriptions de push notifications para envio entre dispositivos';
