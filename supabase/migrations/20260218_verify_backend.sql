-- ==============================================================================
-- SCRIPT DE VERIFICAÇÃO COMPLETA DO BACKEND - SYSHAIR
-- Data: 2026-02-18
-- Descrição: Verifica todas as tabelas, colunas, RLS policies, e funcionalidades
-- ==============================================================================

-- 1. VERIFICAR TABELA SALONS E COLUNA PIX_KEY
DO $$
BEGIN
    -- Adicionar pix_key se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salons' AND column_name = 'pix_key'
    ) THEN
        ALTER TABLE public.salons ADD COLUMN pix_key TEXT;
        RAISE NOTICE 'Coluna pix_key adicionada à tabela salons';
    ELSE
        RAISE NOTICE 'Coluna pix_key já existe na tabela salons';
    END IF;
END $$;

-- 2. VERIFICAR TABELA SERVICE_PACKAGES E SERVICE_PACKAGE_ITEMS
DO $$
BEGIN
    -- Verificar se tabela service_packages existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_packages') THEN
        CREATE TABLE public.service_packages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            discount_percent INTEGER DEFAULT 0,
            validity_days INTEGER DEFAULT 30,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela service_packages criada';
    ELSE
        RAISE NOTICE 'Tabela service_packages já existe';
    END IF;

    -- Verificar se tabela service_package_items existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_package_items') THEN
        CREATE TABLE public.service_package_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
            service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
            quantity INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela service_package_items criada';
    ELSE
        RAISE NOTICE 'Tabela service_package_items já existe';
    END IF;
END $$;

-- 3. VERIFICAR RLS POLICIES PARA SERVICE_PACKAGE_ITEMS
DO $$
BEGIN
    -- Habilitar RLS
    ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

    -- Remover política antiga se existir
    DROP POLICY IF EXISTS "Salon owners can manage package items" ON public.service_package_items;

    -- Criar política para salon owners
    CREATE POLICY "Salon owners can manage package items"
    ON public.service_package_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.service_packages sp
            JOIN public.salons s ON s.id = sp.salon_id
            WHERE sp.id = service_package_items.package_id
            AND s.owner_id = auth.uid()
        )
    );

    RAISE NOTICE 'RLS policy para service_package_items configurada';
END $$;

-- 4. VERIFICAR STORAGE BUCKET 'gallery'
DO $$
BEGIN
    -- Verificar se bucket existe
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gallery') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('gallery', 'gallery', true);
        RAISE NOTICE 'Bucket gallery criado';
    ELSE
        RAISE NOTICE 'Bucket gallery já existe';
    END IF;
END $$;

-- 5. VERIFICAR POLÍTICAS DO BUCKET GALLERY
DO $$
BEGIN
    -- Política de upload (autenticados)
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE bucket_id = 'gallery' AND name = 'Authenticated users can upload to gallery'
    ) THEN
        CREATE POLICY "Authenticated users can upload to gallery"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'gallery');
        RAISE NOTICE 'Política de upload criada para gallery';
    END IF;

    -- Política de leitura (público)
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE bucket_id = 'gallery' AND name = 'Public can view gallery'
    ) THEN
        CREATE POLICY "Public can view gallery"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'gallery');
        RAISE NOTICE 'Política de leitura pública criada para gallery';
    END IF;

    -- Política de delete (donos)
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE bucket_id = 'gallery' AND name = 'Users can delete own files'
    ) THEN
        CREATE POLICY "Users can delete own files"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
        RAISE NOTICE 'Política de delete criada para gallery';
    END IF;
END $$;

-- 6. VERIFICAR TABELA BROADCASTS E BROADCAST_MESSAGES
DO $$
BEGIN
    -- Verificar tabela broadcasts
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcasts') THEN
        CREATE TABLE public.broadcasts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            total_recipients INTEGER NOT NULL,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela broadcasts criada';
    END IF;

    -- Verificar tabela broadcast_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_messages') THEN
        CREATE TABLE public.broadcast_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
            salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
            phone TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            whatsapp_message_id TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela broadcast_messages criada';
    END IF;
END $$;

-- 7. VERIFICAR TABELA AI_PROVIDER_KEYS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_provider_keys') THEN
        CREATE TABLE public.ai_provider_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'gemini')),
            api_key TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela ai_provider_keys criada';
    END IF;
END $$;

-- 8. CRIAR VIEW PARA SERVICE_PACKAGES_WITH_ITEMS (se não existir)
CREATE OR REPLACE VIEW public.service_packages_with_items AS
SELECT
    sp.*,
    json_agg(
        json_build_object(
            'id', spi.id,
            'service_id', spi.service_id,
            'quantity', spi.quantity,
            'service_name', s.name,
            'service_price', s.price
        )
    ) FILTER (WHERE spi.id IS NOT NULL) as items
FROM public.service_packages sp
LEFT JOIN public.service_package_items spi ON spi.package_id = sp.id
LEFT JOIN public.services s ON s.id = spi.service_id
GROUP BY sp.id;

-- 9. RELATÓRIO FINAL
DO $$
DECLARE
    salons_count INTEGER;
    packages_count INTEGER;
    broadcasts_count INTEGER;
    ai_keys_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO salons_count FROM public.salons;
    SELECT COUNT(*) INTO packages_count FROM public.service_packages;
    SELECT COUNT(*) INTO broadcasts_count FROM public.broadcasts;
    SELECT COUNT(*) INTO ai_keys_count FROM public.ai_provider_keys;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO DE VERIFICAÇÃO DO BACKEND';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de Salões: %', salons_count;
    RAISE NOTICE 'Total de Pacotes: %', packages_count;
    RAISE NOTICE 'Total de Broadcasts: %', broadcasts_count;
    RAISE NOTICE 'Total de API Keys IA: %', ai_keys_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verificação concluída com sucesso!';
    RAISE NOTICE '========================================';
END $$;
