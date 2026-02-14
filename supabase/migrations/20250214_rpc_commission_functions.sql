-- Função RPC para calcular comissão de vendedor
-- Data: 2025-02-14

CREATE OR REPLACE FUNCTION public.calculate_commission(
    p_amount DECIMAL(10,2),
    p_payment_type TEXT,
    p_seller_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_commission_percent NUMERIC(5,2);
    v_commission DECIMAL(10,2);
    v_seller_exists BOOLEAN;
BEGIN
    -- Verificar se o vendedor existe
    SELECT EXISTS(
        SELECT 1 FROM public.sellers 
        WHERE id = p_seller_id 
        AND is_active = true
    ) INTO v_seller_exists;

    -- Se vendedor não existe ou está inativo, usar padrão
    IF NOT v_seller_exists THEN
        v_commission_percent := 20.00; -- Padrão 20%
    ELSE
        -- Buscar percentual de comissão do vendedor baseado no tipo de pagamento
        IF p_payment_type = 'annual' THEN
            SELECT commission_annual_percent INTO v_commission_percent
            FROM public.sellers
            WHERE id = p_seller_id
            AND is_active = true
            LIMIT 1;
            
            -- Se for nulo (não definido), usar padrão anual
            IF v_commission_percent IS NULL THEN
                v_commission_percent := 10.00;
            END IF;
        ELSE
            -- Mensal (padrão)
            SELECT commission_monthly_percent INTO v_commission_percent
            FROM public.sellers
            WHERE id = p_seller_id
            AND is_active = true
            LIMIT 1;
            
            -- Se for nulo (não definido), usar padrão mensal
            IF v_commission_percent IS NULL THEN
                v_commission_percent := 20.00;
            END IF;
        END IF;
    END IF;

    -- Validar e limitar o percentual entre 0 e 100
    IF v_commission_percent IS NULL OR v_commission_percent < 0 THEN
        v_commission_percent := 0;
    ELSIF v_commission_percent > 100 THEN
        v_commission_percent := 100;
    END IF;

    -- Calcular comissão (percentual do valor)
    v_commission := (p_amount * v_commission_percent) / 100;

    -- Arredondar para 2 casas decimais
    v_commission := ROUND(v_commission, 2);

    -- Log para debug
    RAISE NOTICE 'Commission calculated: Amount=%, Type=%, Percent=%, Result=%', 
        p_amount, p_payment_type, v_commission_percent, v_commission;

    RETURN v_commission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO ADICIONAL: Obter estatísticas de comissão pendente por vendedor
-- =============================================
CREATE OR REPLACE FUNCTION public.get_seller_commission_summary(p_seller_id UUID DEFAULT NULL)
RETURNS TABLE (
    seller_id UUID,
    seller_name TEXT,
    total_pending DECIMAL(10,2),
    total_approved DECIMAL(10,2),
    total_paid DECIMAL(10,2),
    pending_count INTEGER,
    approved_count INTEGER,
    paid_count INTEGER,
    pending_commission_ids UUID[],
    approved_commission_ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as seller_id,
        s.name as seller_name,
        COALESCE(SUM(CASE WHEN sc.status = 'pending' THEN sc.commission_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN sc.status = 'approved' THEN sc.commission_amount ELSE 0 END), 0) as total_approved,
        COALESCE(SUM(CASE WHEN sc.status = 'paid' THEN sc.commission_amount ELSE 0 END), 0) as total_paid,
        COUNT(CASE WHEN sc.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN sc.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN sc.status = 'paid' THEN 1 END) as paid_count,
        ARRAY_AGG(CASE WHEN sc.status = 'pending' THEN sc.id END) FILTER (WHERE sc.status = 'pending') as pending_commission_ids,
        ARRAY_AGG(CASE WHEN sc.status = 'approved' THEN sc.id END) FILTER (WHERE sc.status = 'approved') as approved_commission_ids
    FROM public.sellers s
    LEFT JOIN public.seller_commissions sc ON sc.seller_id = s.id
    WHERE (p_seller_id IS NULL OR s.id = p_seller_id)
    GROUP BY s.id, s.name
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Obter comissões por período
-- =============================================
CREATE OR REPLACE FUNCTION public.get_commissions_by_period(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_seller_id UUID DEFAULT NULL
)
RETURNS TABLE (
    seller_id UUID,
    seller_name TEXT,
    salon_id UUID,
    salon_name TEXT,
    amount DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    commission_percent NUMERIC(5,2),
    payment_type TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.seller_id,
        s.name as seller_name,
        sc.salon_id,
        sal.name as salon_name,
        sc.amount,
        sc.commission_amount,
        sc.commission_percent,
        sc.payment_type,
        sc.status,
        sc.created_at,
        sc.paid_at
    FROM public.seller_commissions sc
    JOIN public.sellers s ON sc.seller_id = s.id
    JOIN public.salons sal ON sc.salon_id = sal.id
    WHERE sc.created_at >= p_start_date
    AND sc.created_at <= p_end_date
    AND (p_seller_id IS NULL OR sc.seller_id = p_seller_id)
    ORDER BY sc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS (RPC Functions need explicit grants)
-- =============================================
GRANT EXECUTE ON FUNCTION public.calculate_commission TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_commission_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commissions_by_period TO authenticated;

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON FUNCTION public.calculate_commission IS 'Calcula comissão baseada no valor e tipo de pagamento, usando percentual do vendedor. Retorna valor da comissão em BRL.';
COMMENT ON FUNCTION public.get_seller_commission_summary IS 'Obter resumo de comissões por vendedor (pending, approved, paid).';
COMMENT ON FUNCTION public.get_commissions_by_period IS 'Obter histórico de comissões filtrado por período e opcionalmente por vendedor.';

-- Status: ✅ Pronto
