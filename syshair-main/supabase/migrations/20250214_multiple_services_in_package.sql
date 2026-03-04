-- Migration: Suportar múltiplos serviços em um pacote (Combo)
-- Data: 2025-02-14
-- Descrição: Permite criar pacotes com vários serviços (ex: 5 cortes + 5 barbas)

-- =============================================
-- 1. CRIAR TABELA DE ITENS DO PACOTE (service_package_items)
-- =============================================
CREATE TABLE IF NOT EXISTS public.service_package_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON public.service_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_service_id ON public.service_package_items(service_id);

-- RLS para itens de pacote
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view package items" ON public.service_package_items
  FOR SELECT USING (true);

CREATE POLICY "Salon owners can manage package items" ON public.service_package_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM service_packages sp
    JOIN salons s ON sp.salon_id = s.id
    WHERE sp.id = service_package_items.package_id AND s.owner_id = auth.uid()
  ));

-- =============================================
-- 2. REMOVER COLUNAS ANTIGAS (service_id, quantity) DA TABELA service_packages
-- =============================================
-- Nota: Fazer de forma segura para não quebrar dados existentes

-- Criar colunas temporárias para migrar dados existentes
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS temp_service_id UUID REFERENCES public.services(id);
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS temp_quantity INTEGER DEFAULT 1;

-- Migrar dados das colunas antigas para as temporárias
UPDATE public.service_packages 
SET temp_service_id = service_id, temp_quantity = quantity
WHERE service_id IS NOT NULL;

-- Agora podemos remover as colunas antigas
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS service_id;
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS quantity;

-- =============================================
-- 3. MIGRAR PACOTES EXISTENTES PARA A NOVA ESTRUTURA
-- =============================================
-- Para cada pacote existente, criar um item em service_package_items
INSERT INTO public.service_package_items (package_id, service_id, quantity, created_at)
SELECT 
    sp.id as package_id,
    sp.temp_service_id as service_id,
    COALESCE(sp.temp_quantity, 1) as quantity,
    sp.created_at
FROM public.service_packages sp
WHERE sp.temp_service_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.service_package_items spi 
    WHERE spi.package_id = sp.id
);

-- Migrar créditos de clientes para usar a nova estrutura
-- Atualizar package_id para manter referência ao pacote
UPDATE public.client_credits cc
SET package_id = sp.id
FROM public.service_packages sp
WHERE cc.service_id IS NOT NULL
AND sp.id = (
    SELECT spi.package_id 
    FROM public.service_package_items spi 
    WHERE spi.service_id = cc.service_id 
    LIMIT 1
);

-- =============================================
-- 4. LIMPAR - REMOVER COLUNAS TEMPORÁRIAS
-- =============================================
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS temp_service_id;
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS temp_quantity;

-- =============================================
-- 5. VIEWS ÚTEIS
-- =============================================

-- View para mostrar pacotes com seus itens (serviços incluídos)
CREATE OR REPLACE VIEW public.service_packages_with_items AS
SELECT 
    sp.id,
    sp.salon_id,
    sp.name,
    sp.description,
    sp.price,
    sp.discount_percent,
    sp.validity_days,
    sp.is_active,
    sp.created_at,
    COALESCE(SUM(spi.quantity), 0) as total_services,
    ARRAY_AGG(
        jsonb_build_object(
            'service_id', spi.service_id,
            'service_name', s.name,
            'service_price', s.price,
            'quantity', spi.quantity,
            'subtotal', (s.price * spi.quantity)
        ) ORDER BY s.name
    ) as items,
    COALESCE(SUM(s.price * spi.quantity), 0) as original_price
FROM public.service_packages sp
LEFT JOIN public.service_package_items spi ON spi.package_id = sp.id
LEFT JOIN public.services s ON s.id = spi.service_id
GROUP BY sp.id
ORDER BY sp.created_at DESC;

-- View para contagem de créditos por pacote
CREATE OR REPLACE VIEW public.package_credit_count AS
SELECT 
    cc.package_id,
    cc.client_id,
    sp.name as package_name,
    COUNT(*) as total_credits,
    SUM(cc.remaining_uses) as remaining_uses
FROM public.client_credits cc
JOIN public.service_packages sp ON sp.id = cc.package_id
GROUP BY cc.package_id, cc.client_id, sp.name;

-- =============================================
-- 6. FUNÇÕES ÚTEIS
-- =============================================

-- Função para calcular preço do pacote baseado nos itens
CREATE OR REPLACE FUNCTION public.calculate_package_price(p_package_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT SUM(s.price * spi.quantity)
    INTO v_total
    FROM public.service_package_items spi
    JOIN public.services s ON s.id = spi.service_id
    WHERE spi.package_id = p_package_id;
    
    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter detalhes completos do pacote
CREATE OR REPLACE FUNCTION public.get_package_details(p_package_id UUID)
RETURNS TABLE (
    package_id UUID,
    package_name TEXT,
    salon_id UUID,
    price NUMERIC,
    discount_percent NUMERIC,
    validity_days INTEGER,
    is_active BOOLEAN,
    items JSONB,
    original_price NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id as package_id,
        sp.name as package_name,
        sp.salon_id,
        sp.price,
        sp.discount_percent,
        sp.validity_days,
        sp.is_active,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'service_id', spi.service_id,
                    'service_name', s.name,
                    'service_price', s.price,
                    'quantity', spi.quantity,
                    'subtotal', (s.price * spi.quantity)
                )
            )
            FROM public.service_package_items spi
            JOIN public.services s ON s.id = spi.service_id
            WHERE spi.package_id = sp.id
        ) as items,
        public.calculate_package_price(sp.id) as original_price
    FROM public.service_packages sp
    WHERE sp.id = p_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. COMENTÁRIOS
-- =============================================
COMMENT ON TABLE public.service_package_items IS 'Itens que compõem um pacote de serviços. Cada item contém um serviço e a quantidade incluída no pacote.';
COMMENT ON FUNCTION public.calculate_package_price IS 'Calcula o preço total de um pacote somando o preço de todos os serviços x suas quantidades.';
COMMENT ON FUNCTION public.get_package_details IS 'Retorna detalhes completos do pacote incluindo todos os itens (serviços) que o compõem.';
COMMENT ON VIEW public.service_packages_with_items IS 'View que mostra pacotes com todos os seus itens e o preço original (sem desconto).';

-- =============================================
-- 8. VERIFICAÇÃO
-- =============================================

-- Verificar pacotes com seus itens
SELECT 
    sp.name as package_name,
    COUNT(spi.id) as num_items,
    STRING_AGG(s.name || ' (' || spi.quantity || 'x)', ', ') as items
FROM public.service_packages sp
LEFT JOIN public.service_package_items spi ON spi.package_id = sp.id
LEFT JOIN public.services s ON s.id = spi.service_id
GROUP BY sp.id, sp.name;

-- =============================================
-- LOGS
-- =============================================

-- Status: ✅ Pronto
-- Tabelas criadas: service_package_items
-- Tabelas modificadas: service_packages (removido service_id, quantity)
-- Views criadas: service_packages_with_items, package_credit_count
-- Funções criadas: calculate_package_price(), get_package_details()
-- Migrado: Pacotes existentes migrados para nova estrutura com múltiplos itens
