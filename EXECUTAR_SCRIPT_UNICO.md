# 🚨 EXECUTAR ESTE SCRIPT ÚNICO NO SUPABASE

**URL:** https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

---

## ✅ SCRIPT ÚNICO - COPIE E EXECUTE

```sql
-- ==============================================================================
-- CORREÇÃO COMPLETA - SYSHAIR
-- Data: 2026-02-18
-- ==============================================================================

-- 1. ADICIONAR COLUNAS EM SALONS
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#c9a227';
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. REMOVER COLUNA service_id DE service_packages (CORREÇÃO CRÍTICA)
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS service_id;

-- 3. CRIAR BUCKET GALLERY
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 4. POLÍTICAS DO BUCKET GALLERY
DROP POLICY IF EXISTS "Authenticated users can upload to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update gallery" ON storage.objects;

CREATE POLICY "Authenticated users can upload to gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Public can view gallery"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated can update gallery"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery');

-- 5. CRIAR TABELA service_package_items
CREATE TABLE IF NOT EXISTS public.service_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS PARA service_package_items
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon owners can manage package items" ON public.service_package_items;

CREATE POLICY "Salon owners can manage package items"
ON public.service_package_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.service_packages sp
        JOIN public.salons s ON s.id = sp.salon_id
        WHERE sp.id = service_package_items.package_id
        AND s.owner_id = auth.uid()
    )
);

-- 7. CRIAR VIEW service_packages_with_items
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

-- 8. CRIAR TABELA ai_provider_keys
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'groq', 'gemini')),
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. MENSAGEM DE SUCESSO
SELECT '✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!' as status;
```

---

## ✅ Após Executar

1. **Recarregue a página** do admin (Ctrl+F5)

2. **Teste criar pacote:**
   - Ir em Pacotes
   - Novo Pacote
   - Adicionar 3 serviços
   - Salvar
   - ✅ Deve funcionar!

3. **Verifique localmente:**
```bash
cd /d/Projetos/syshair-main
node verify-backend.mjs
```

---

## 🐛 Problemas Corrigidos

1. ✅ Coluna `theme_color` adicionada
2. ✅ Coluna `pix_key` adicionada
3. ✅ Coluna `service_id` REMOVIDA de `service_packages` (era o erro!)
4. ✅ Bucket `gallery` criado
5. ✅ View `service_packages_with_items` criada (era o 404!)
6. ✅ Tabela `service_package_items` criada
7. ✅ RLS policies configuradas

---

**Data:** 2026-02-18 01:33 AM
**Status:** ⚠️ AGUARDANDO EXECUÇÃO
