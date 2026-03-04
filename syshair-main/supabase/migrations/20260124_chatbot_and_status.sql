-- =============================================
-- SYSHAIR - CHATBOT IA & STATUS SCHEDULER
-- Migration: 20260124_chatbot_and_status.sql
-- =============================================

-- 1. Tabela de Instâncias WhatsApp (Evolution API)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    instance_token TEXT,
    api_url TEXT DEFAULT 'https://api.tubaraoemprestimo.com.br',
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'qrcode')),
    qrcode TEXT,
    phone_number TEXT,
    webhook_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(salon_id)
);

-- 2. Tabela de Configurações do Chatbot IA
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    
    -- Configurações gerais
    enabled BOOLEAN DEFAULT false,
    ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'gemini', 'grok', 'perplexity')),
    ai_model TEXT DEFAULT 'gpt-4o-mini',
    api_key TEXT, -- Criptografada
    
    -- Personalização
    bot_name TEXT DEFAULT 'Assistente',
    welcome_message TEXT DEFAULT 'Olá! Sou o assistente virtual do salão. Como posso ajudar?',
    
    -- Prompt de treinamento
    system_prompt TEXT DEFAULT 'Você é um assistente virtual de um salão de beleza. Seja educado, prestativo e ajude os clientes com informações sobre serviços, agendamentos e preços.',
    custom_instructions TEXT,
    
    -- Configurações avançadas
    temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 500,
    response_delay_ms INTEGER DEFAULT 1000,
    
    -- Horário de funcionamento do bot
    active_hours_start TIME DEFAULT '08:00',
    active_hours_end TIME DEFAULT '22:00',
    active_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=Dom, 1=Seg, ..., 6=Sab
    
    -- Mensagens automáticas
    out_of_hours_message TEXT DEFAULT 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!',
    fallback_message TEXT DEFAULT 'Desculpe, não entendi. Pode reformular sua pergunta?',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(salon_id)
);

-- 3. Tabela de Conversas do Chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    
    -- Identificação do cliente
    client_phone TEXT NOT NULL,
    client_name TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Mensagem
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker')),
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content TEXT NOT NULL,
    media_url TEXT,
    
    -- IA
    ai_response BOOLEAN DEFAULT false,
    ai_provider TEXT,
    ai_model TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    
    -- Status
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    
    -- Metadados
    whatsapp_message_id TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_salon_id ON public.chatbot_conversations(salon_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_client_phone ON public.chatbot_conversations(client_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON public.chatbot_conversations(created_at DESC);

-- 4. Tabela de Posts Agendados para Status
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    
    -- Conteúdo
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
    text_content TEXT,
    media_url TEXT,
    media_filename TEXT,
    
    -- Agendamento
    scheduled_at TIMESTAMPTZ NOT NULL,
    recurrence_type TEXT DEFAULT 'once' CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly')),
    recurrence_days INTEGER[], -- Para weekly: 0=Dom, 1=Seg, ..., 6=Sab
    recurrence_end_date DATE,
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'posted', 'failed', 'cancelled')),
    posted_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Metadados
    whatsapp_status_id TEXT,
    created_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_salon_id ON public.scheduled_posts(salon_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);

-- 5. Tabela de Prompts de Treinamento (Base de conhecimento)
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    
    -- Conteúdo
    category TEXT DEFAULT 'general',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[],
    
    -- Configurações
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_base_salon_id ON public.chatbot_knowledge_base(salon_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_instances
CREATE POLICY "Salon owners can manage their WhatsApp instances"
    ON public.whatsapp_instances FOR ALL
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Policies para chatbot_settings
CREATE POLICY "Salon owners can manage chatbot settings"
    ON public.chatbot_settings FOR ALL
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Policies para chatbot_conversations
CREATE POLICY "Salon owners can view their conversations"
    ON public.chatbot_conversations FOR ALL
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Policies para scheduled_posts
CREATE POLICY "Salon owners can manage scheduled posts"
    ON public.scheduled_posts FOR ALL
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- Policies para chatbot_knowledge_base
CREATE POLICY "Salon owners can manage knowledge base"
    ON public.chatbot_knowledge_base FOR ALL
    USING (salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid()));

-- =============================================
-- Functions
-- =============================================

-- Função para obter posts que precisam ser publicados
CREATE OR REPLACE FUNCTION public.get_pending_scheduled_posts()
RETURNS TABLE (
    post_id UUID,
    salon_id UUID,
    instance_name TEXT,
    content_type TEXT,
    text_content TEXT,
    media_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        sp.id as post_id,
        sp.salon_id,
        wi.instance_name,
        sp.content_type,
        sp.text_content,
        sp.media_url
    FROM public.scheduled_posts sp
    JOIN public.whatsapp_instances wi ON wi.salon_id = sp.salon_id
    WHERE sp.status = 'scheduled'
    AND sp.scheduled_at <= now()
    AND wi.status = 'connected';
$$;

-- Função para marcar post como publicado
CREATE OR REPLACE FUNCTION public.mark_post_as_posted(post_id UUID, status_id TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.scheduled_posts
    SET 
        status = 'posted',
        posted_at = now(),
        whatsapp_status_id = status_id,
        updated_at = now()
    WHERE id = post_id;
END;
$$;

-- Função para salvar mensagem de conversa
CREATE OR REPLACE FUNCTION public.save_chatbot_message(
    p_salon_id UUID,
    p_client_phone TEXT,
    p_direction TEXT,
    p_content TEXT,
    p_ai_response BOOLEAN DEFAULT false,
    p_ai_provider TEXT DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO public.chatbot_conversations (
        salon_id, client_phone, direction, content, 
        ai_response, ai_provider, tokens_used
    )
    VALUES (
        p_salon_id, p_client_phone, p_direction, p_content,
        p_ai_response, p_ai_provider, p_tokens_used
    )
    RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_instances_updated_at
    BEFORE UPDATE ON public.whatsapp_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_settings_updated_at
    BEFORE UPDATE ON public.chatbot_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
    BEFORE UPDATE ON public.scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_knowledge_base_updated_at
    BEFORE UPDATE ON public.chatbot_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Comentários
-- =============================================
COMMENT ON TABLE public.whatsapp_instances IS 'Instâncias Evolution API para cada salão';
COMMENT ON TABLE public.chatbot_settings IS 'Configurações do chatbot IA por salão';
COMMENT ON TABLE public.chatbot_conversations IS 'Histórico de conversas do chatbot';
COMMENT ON TABLE public.scheduled_posts IS 'Posts agendados para status do WhatsApp';
COMMENT ON TABLE public.chatbot_knowledge_base IS 'Base de conhecimento para treinamento da IA';
