-- Migration: Adicionar sistema de vendedores e comissões
-- Data: 2025-02-14
-- Descrição: Implementa sistema de gestão de vendedores, comissões e vinculação com salões

-- =============================================
-- 1. TABELA DE VENDEDORES
-- =============================================
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    whatsapp TEXT,
    commission_monthly_percent NUMERIC(5,2) DEFAULT 20.00 CHECK (commission_monthly_percent >= 0 AND commission_monthly_percent <= 100),
    commission_annual_percent NUMERIC(5,2) DEFAULT 10.00 CHECK (commission_annual_percent >= 0 AND commission_annual_percent <= 100),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sellers_email ON public.sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON public.sellers(is_active);

-- RLS para vendedores (apenas super admin pode ver/editar)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admin can view sellers"
ON public.sellers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('jefferson22gs@gmail.com', 'admin@syshair.com')
    )
);

-- =============================================
-- 2. ADICIONAR seller_id NA TABELA salons
-- =============================================
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Índice para buscar salões por vendedor
CREATE INDEX IF NOT EXISTS idx_salons_seller_id ON public.salons(seller_id);
CREATE INDEX IF NOT EXISTS idx_salons_all_with_seller ON public.salons(seller_id, is_active);

-- =============================================
-- 3. TABELA DE COMISSÕES (HISTÓRICO)
-- =============================================
CREATE TABLE IF NOT EXISTS public.seller_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.subscription_payments(id) ON DELETE CASCADE,

    -- Dados do pagamento base
    amount DECIMAL(10,2) NOT NULL,
    commission_percent NUMERIC(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('monthly', 'annual')),

    -- Status da comissão
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    paid_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    payment_method TEXT, -- 'pix', 'bank_transfer', 'cash'

    -- Referências
    mp_payment_id TEXT,
    subscription_plan TEXT,

    -- Metadados
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_commissions_seller_id ON public.seller_commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_salon_id ON public.seller_commissions(salon_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.seller_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON public.seller_commissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_status ON public.seller_commissions(seller_id, status);

-- RLS para comissões (apenas super admin)
ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super admin can view commissions"
ON public.seller_commissions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email IN ('jefferson22gs@gmail.com', 'admin@syshair.com')
    )
);

-- =============================================
-- 4. TRIGGER PARA updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON public.seller_commissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. VENDORES DE DEMONSTRAÇÃO (Opcional)
-- =============================================
-- Você pode inserir vendedores iniciais ou limpar esta parte
-- INSERT INTO public.sellers (name, email, phone, whatsapp, commission_monthly_percent, commission_annual_percent) VALUES
-- ('Vendedor Exemplo', 'exemplo@email.com', '11999998888', '5511999998888', 20.00, 10.00);

-- =============================================
-- 6. FUNÇÃO PARA CÁLCULAR COMISSÕES
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_commission(
    p_amount DECIMAL(10,2),
    p_payment_type TEXT,
    p_seller_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_commission_percent NUMERIC(5,2);
    v_commission DECIMAL(10,2);
BEGIN
    -- Buscar percentual de comissão do vendedor
    IF p_payment_type = 'monthly' THEN
        SELECT commission_monthly_percent INTO v_commission_percent
        FROM public.sellers
        WHERE id = p_seller_id
        LIMIT 1;
    ELSE
        SELECT commission_annual_percent INTO v_commission_percent
        FROM public.sellers
        WHERE id = p_seller_id
        LIMIT 1;
    END IF;

    -- Se vendedor não encontrado, usar padrão
    IF v_commission_percent IS NULL THEN
        v_commission_percent := 20.00;
    END IF;

    -- Calcular comissão
    v_commission := (p_amount * v_commission_percent) / 100;

    RETURN v_commission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. VIEWS UTEIS
-- =============================================
CREATE OR REPLACE VIEW public.seller_stats AS
SELECT
    s.id as seller_id,
    s.name as seller_name,
    s.email,
    s.phone,
    s.is_active,
    COUNT(DISTINCT salon.id) as total_salons,
    COUNT(DISTINCT salon.id) FILTER (WHERE salon.is_active = true) as active_salons,
    COUNT(DISTINCT salon.id) FILTER (WHERE salon.created_at >= NOW() - INTERVAL '30 days') as new_salons_30d,
    COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'paid'), 0) as total_paid,
    COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'approved'), 0) as total_to_pay,
    COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'pending'), 0) as total_pending,
    s.commission_monthly_percent,
    s.commission_annual_percent
FROM public.sellers s
LEFT JOIN public.salons salon ON salon.seller_id = s.id
LEFT JOIN public.seller_commissions sc ON sc.seller_id = s.id
GROUP BY s.id
ORDER BY s.name;

-- =============================================
-- 8. COMENTÁRIO DE DOCUMENTAÇÃO
-- =============================================
COMMENT ON TABLE public.sellers IS 'Tabela de vendedores parceiros do SysHair. Apenas Super Admin pode gerenciar.';
COMMENT ON TABLE public.seller_commissions IS 'Histórico de comissões pagas ou pendentes para vendedores baseado em assinaturas ativas.';
COMMENT ON COLUMN public.salons.seller_id IS 'ID do vendedor que indicou/fechou a venda do sistema para este salão.';
COMMENT ON FUNCTION public.calculate_commission IS 'Calcula o valor da comissão baseado no valor pago e tipo (mensal/anual), usando o percentual do vendedor.';

-- =============================================
-- 9. MIGRAÇÃO COMPILADA
-- =============================================
-- Status: ✅ Pronto
-- Tabelas criadas:
--   - sellers (vendedores)
--   - seller_commissions (histórico de comissões)
-- Campos adicionados:
--   - salons.seller_id
-- Views criadas:
--   - seller_stats (estatísticas consolidadas)
-- Funções criadas:
--   - calculate_commission()
-- Triggers criados:
--   - update_sellers_updated_at
--   - update_commissions_updated_at
-- Políticas criadas:
--   - Restrição de acesso apenas para Super Admin
