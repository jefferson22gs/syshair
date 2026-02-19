-- ==============================================================================
-- CORREÇÃO CRÍTICA: Adicionar colunas faltantes e criar bucket gallery
-- Data: 2026-02-18
-- ==============================================================================

-- 1. ADICIONAR COLUNA THEME_COLOR (se não existir)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#c9a227';

-- 2. ADICIONAR COLUNA PIX_KEY (se não existir)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 3. ADICIONAR COLUNA LOGO_URL (se não existir)
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 4. CRIAR BUCKET GALLERY
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 5. POLÍTICAS DO BUCKET GALLERY
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Authenticated users can upload to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update gallery" ON storage.objects;

-- Política de INSERT (upload)
CREATE POLICY "Authenticated users can upload to gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

-- Política de SELECT (leitura pública)
CREATE POLICY "Public can view gallery"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');

-- Política de UPDATE
CREATE POLICY "Authenticated can update gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

-- Política de DELETE (apenas donos)
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');

-- 6. VERIFICAR TABELA SERVICE_PACKAGE_ITEMS
CREATE TABLE IF NOT EXISTS public.service_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RLS PARA SERVICE_PACKAGE_ITEMS
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

-- 8. VERIFICAR TABELA AI_PROVIDER_KEYS
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'gemini')),
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. RELATÓRIO FINAL
DO $$
DECLARE
    salons_count INTEGER;
    has_theme_color BOOLEAN;
    has_pix_key BOOLEAN;
    has_logo_url BOOLEAN;
BEGIN
    -- Verificar colunas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salons' AND column_name = 'theme_color'
    ) INTO has_theme_color;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salons' AND column_name = 'pix_key'
    ) INTO has_pix_key;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salons' AND column_name = 'logo_url'
    ) INTO has_logo_url;

    SELECT COUNT(*) INTO salons_count FROM public.salons;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO DE CORREÇÃO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de Salões: %', salons_count;
    RAISE NOTICE 'Coluna theme_color: %', CASE WHEN has_theme_color THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna pix_key: %', CASE WHEN has_pix_key THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna logo_url: %', CASE WHEN has_logo_url THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Correção concluída!';
    RAISE NOTICE '========================================';
END $$;
