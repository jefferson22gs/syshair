-- Adicionar coluna fcm_token para Firebase Cloud Messaging
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Criar índice para buscar por fcm_token
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token 
ON public.push_subscriptions(fcm_token) 
WHERE fcm_token IS NOT NULL;

-- Comentário
COMMENT ON COLUMN public.push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token para envio de notificações';
