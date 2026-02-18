-- ==============================================================================
-- CORREÇÃO: Remover coluna service_id da tabela service_packages
-- Data: 2026-02-18
-- Problema: Coluna service_id não deveria existir em service_packages
-- ==============================================================================

-- 1. Verificar e remover coluna service_id de service_packages (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_packages' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE public.service_packages DROP COLUMN service_id;
        RAISE NOTICE '✅ Coluna service_id removida de service_packages';
    ELSE
        RAISE NOTICE '✅ Coluna service_id não existe em service_packages (OK)';
    END IF;
END $$;

-- 2. Verificar estrutura correta da tabela service_packages
DO $$
DECLARE
    has_salon_id BOOLEAN;
    has_name BOOLEAN;
    has_price BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_packages' AND column_name = 'salon_id'
    ) INTO has_salon_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_packages' AND column_name = 'name'
    ) INTO has_name;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_packages' AND column_name = 'price'
    ) INTO has_price;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ESTRUTURA DA TABELA service_packages';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Coluna salon_id: %', CASE WHEN has_salon_id THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna name: %', CASE WHEN has_name THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna price: %', CASE WHEN has_price THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE '========================================';
END $$;

-- 3. Verificar estrutura da tabela service_package_items
DO $$
DECLARE
    has_package_id BOOLEAN;
    has_service_id BOOLEAN;
    has_quantity BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_package_items' AND column_name = 'package_id'
    ) INTO has_package_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_package_items' AND column_name = 'service_id'
    ) INTO has_service_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_package_items' AND column_name = 'quantity'
    ) INTO has_quantity;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'ESTRUTURA DA TABELA service_package_items';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Coluna package_id: %', CASE WHEN has_package_id THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna service_id: %', CASE WHEN has_service_id THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna quantity: %', CASE WHEN has_quantity THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE '========================================';
END $$;

-- 4. Relatório final
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Agora você pode criar pacotes normalmente.';
    RAISE NOTICE '========================================';
END $$;
