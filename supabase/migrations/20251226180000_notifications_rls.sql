-- Permitir leitura pública de notificações para o Service Worker
-- Isso permite que as notificações push mostrem a mensagem correta

-- Habilitar RLS se não estiver habilitado
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública de notificações enviadas
CREATE POLICY IF NOT EXISTS "Anyone can read sent notifications" 
ON public.notifications 
FOR SELECT 
USING (status = 'sent');

-- Permitir que salões gerenciem suas notificações
CREATE POLICY IF NOT EXISTS "Salon owners can manage notifications"
ON public.notifications
FOR ALL
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);
