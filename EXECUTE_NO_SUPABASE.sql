-- ==============================================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO RÁPIDA - SYSHAIR
-- INSTRUÇÕES: Copie e cole este script completo no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
-- ==============================================================================

-- 1. ADICIONAR COLUNA PIX_KEY (se não existir)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 2. VERIFICAR E CRIAR BUCKET GALLERY
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- 3. POLÍTICAS DO BUCKET GALLERY
-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can upload to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Criar políticas novas
CREATE POLICY "Authenticated users can upload to gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Public can view gallery"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');

-- 4. VERIFICAR TABELA SERVICE_PACKAGE_ITEMS
CREATE TABLE IF NOT EXISTS public.service_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS PARA SERVICE_PACKAGE_ITEMS
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon owners can manage package items" ON public.service_package_items;

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

-- 6. VERIFICAR TABELA AI_PROVIDER_KEYS
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'gemini')),
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RELATÓRIO DE VERIFICAÇÃO
DO $$
DECLARE
    salons_count INTEGER;
    packages_count INTEGER;
    package_items_count INTEGER;
    broadcasts_count INTEGER;
    ai_keys_count INTEGER;
    pix_configured INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO salons_count FROM public.salons;
    SELECT COUNT(*) INTO packages_count FROM public.service_packages;
    SELECT COUNT(*) INTO package_items_count FROM public.service_package_items;
    SELECT COUNT(*) INTO broadcasts_count FROM public.broadcasts;
    SELECT COUNT(*) INTO ai_keys_count FROM public.ai_provider_keys;
    SELECT COUNT(*) INTO pix_configured FROM public.salons WHERE pix_key IS NOT NULL;

    -- Exibir relatório
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO DE VERIFICAÇÃO - SYSHAIR';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de Salões: %', salons_count;
    RAISE NOTICE 'Salões com PIX configurado: %', pix_configured;
    RAISE NOTICE 'Total de Pacotes: %', packages_count;
    RAISE NOTICE 'Total de Itens de Pacotes: %', package_items_count;
    RAISE NOTICE 'Total de Broadcasts: %', broadcasts_count;
    RAISE NOTICE 'Total de API Keys IA: %', ai_keys_count;
    RAISE NOTICE '========================================';

    -- Verificar bucket gallery
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gallery') THEN
        RAISE NOTICE '✅ Bucket gallery: OK';
    ELSE
        RAISE NOTICE '❌ Bucket gallery: NÃO ENCONTRADO';
    END IF;

    -- Verificar políticas do bucket
    IF EXISTS (SELECT 1 FROM storage.policies WHERE bucket_id = 'gallery') THEN
        RAISE NOTICE '✅ Políticas do bucket gallery: OK';
    ELSE
        RAISE NOTICE '❌ Políticas do bucket gallery: NÃO ENCONTRADAS';
    END IF;

    -- Verificar RLS em service_package_items
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_package_items') THEN
        RAISE NOTICE '✅ RLS em service_package_items: OK';
    ELSE
        RAISE NOTICE '❌ RLS em service_package_items: NÃO CONFIGURADO';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verificação concluída!';
    RAISE NOTICE '========================================';
END $$;

-- 8. VERIFICAR ESTRUTURA DA TABELA SALONS
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'salons'
AND column_name IN ('pix_key', 'logo_url', 'theme_color', 'slug')
ORDER BY ordinal_position;
