-- =============================================
-- SYSHAIR - TABELAS PARA DISPARO DE MENSAGENS
-- Disparo em massa com proteção contra bloqueio
-- =============================================

-- Tabela de broadcasts (disparos)
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'stopped', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de mensagens individuais do broadcast
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE CASCADE NOT NULL,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
    error_message TEXT,
    whatsapp_message_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_salon ON public.broadcasts(salon_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON public.broadcasts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_broadcast ON public.broadcast_messages(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_salon ON public.broadcast_messages(salon_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON public.broadcast_messages(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created ON public.broadcast_messages(created_at);

-- RLS Policies
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Broadcasts: Usuários podem ver/criar broadcasts do próprio salão
CREATE POLICY "Users can view own salon broadcasts"
ON public.broadcasts FOR SELECT
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create broadcasts for own salon"
ON public.broadcasts FOR INSERT
WITH CHECK (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own salon broadcasts"
ON public.broadcasts FOR UPDATE
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

-- Broadcast Messages: Mesmas políticas
CREATE POLICY "Users can view own salon broadcast messages"
ON public.broadcast_messages FOR SELECT
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create broadcast messages for own salon"
ON public.broadcast_messages FOR INSERT
WITH CHECK (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

-- Service role access
CREATE POLICY "Service role full access broadcasts"
ON public.broadcasts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access broadcast_messages"
ON public.broadcast_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.broadcasts IS 'Disparos de mensagens em massa';
COMMENT ON TABLE public.broadcast_messages IS 'Mensagens individuais de cada disparo';
COMMENT ON COLUMN public.broadcasts.status IS 'pending, processing, completed, stopped, failed';
