-- Atualizar push_subscriptions que têm salon_id NULL
-- Associa ao primeiro salão ativo do sistema (para fins de teste)

DO $$
DECLARE
    first_salon_id UUID;
BEGIN
    -- Pegar o primeiro salão ativo
    SELECT id INTO first_salon_id 
    FROM public.salons 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Atualizar subscriptions sem salon_id
    IF first_salon_id IS NOT NULL THEN
        UPDATE public.push_subscriptions 
        SET salon_id = first_salon_id 
        WHERE salon_id IS NULL;
        
        RAISE NOTICE 'Subscriptions atualizadas com salon_id: %', first_salon_id;
    END IF;
END $$;

-- Verificar quantidade de subscriptions ativas
DO $$
DECLARE
    sub_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sub_count FROM public.push_subscriptions WHERE is_active = true;
    RAISE NOTICE 'Total de subscriptions ativas: %', sub_count;
END $$;
