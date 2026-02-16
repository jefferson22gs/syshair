-- =============================================
-- SYSHAIR - TABELA PARA TEMPLATES DE MENSAGENS
-- Templates de mensagens para disparo em massa
-- =============================================

-- Tabela de templates de mensagens
CREATE TABLE IF NOT EXISTS public.broadcast_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_salon ON public.broadcast_templates(salon_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_created ON public.broadcast_templates(created_at DESC);

-- RLS Policy
ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;

-- Templates: Usuários podem ver/criar templates do próprio salão
CREATE POLICY "Users can view own salon broadcast templates"
ON public.broadcast_templates FOR SELECT
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create broadcast templates for own salon"
ON public.broadcast_templates FOR INSERT
WITH CHECK (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update own salon broadcast templates"
ON public.broadcast_templates FOR UPDATE
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own salon broadcast templates"
ON public.broadcast_templates FOR DELETE
USING (
    salon_id IN (SELECT id FROM public.salons WHERE owner_id = auth.uid())
);

-- Service role access
CREATE POLICY "Service role full access broadcast_templates"
ON public.broadcast_templates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.broadcast_templates IS 'Templates de mensagens para disparo em massa';

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_broadcast_templates_updated_at
    BEFORE UPDATE ON public.broadcast_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();