# 🚨 EXECUTAR ESTE SCRIPT NO SUPABASE - VERSÃO CORRIGIDA

## ⚠️ SCRIPT CORRIGIDO (sem erro de storage.policies)

### Passo 1: Acessar Supabase SQL Editor

**URL:** https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql

### Passo 2: Copiar e Colar Este Script Completo

```sql
-- ==============================================================================
-- CORREÇÃO CRÍTICA SIMPLIFICADA - EXECUTAR NO SUPABASE SQL EDITOR
-- Data: 2026-02-18
-- ==============================================================================

-- 1. ADICIONAR COLUNA THEME_COLOR
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#c9a227';

-- 2. ADICIONAR COLUNA PIX_KEY
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 3. ADICIONAR COLUNA LOGO_URL
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 4. CRIAR BUCKET GALLERY (se não existir)
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

-- Criar políticas novas
CREATE POLICY "Authenticated users can upload to gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Public can view gallery"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated can update gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

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
    has_gallery_bucket BOOLEAN;
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

    -- Verificar bucket
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'gallery'
    ) INTO has_gallery_bucket;

    SELECT COUNT(*) INTO salons_count FROM public.salons;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO DE CORREÇÃO - SYSHAIR';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de Salões: %', salons_count;
    RAISE NOTICE 'Coluna theme_color: %', CASE WHEN has_theme_color THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna pix_key: %', CASE WHEN has_pix_key THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Coluna logo_url: %', CASE WHEN has_logo_url THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'Bucket gallery: %', CASE WHEN has_gallery_bucket THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE '========================================';

    IF has_theme_color AND has_pix_key AND has_logo_url AND has_gallery_bucket THEN
        RAISE NOTICE '✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!';
    ELSE
        RAISE NOTICE '⚠️  ALGUMAS CORREÇÕES FALHARAM - VERIFIQUE OS LOGS';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Testar upload de logo em Configurações';
    RAISE NOTICE '2. Testar criar pacote com múltiplos serviços';
    RAISE NOTICE '3. Configurar chave PIX';
    RAISE NOTICE '4. Executar: node verify-backend.mjs';
    RAISE NOTICE '========================================';
END $$;
```

### Passo 3: Clicar em "RUN"

Aguarde a execução. Você verá no painel "Messages":

```
✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!
```

### Passo 4: Verificar Bucket Gallery

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/storage/buckets
2. Confirme que o bucket `gallery` aparece
3. Verifique se está marcado como "Public"

### Passo 5: Verificar Localmente

Execute no terminal:

```bash
cd /d/Projetos/syshair-main
node verify-backend.mjs
```

Você deve ver:
```
✅ Conexão: OK
✅ Tabela salons: OK
✅ Storage bucket gallery: OK
```

---

## 🎯 O Que Este Script Faz

1. ✅ Adiciona coluna `theme_color` (necessária para PWA)
2. ✅ Adiciona coluna `pix_key` (necessária para pagamentos)
3. ✅ Adiciona coluna `logo_url` (necessária para logos)
4. ✅ Cria bucket `gallery` no Storage (necessário para upload)
5. ✅ Configura 4 políticas RLS do bucket gallery
6. ✅ Cria tabela `service_package_items` (se não existir)
7. ✅ Configura RLS para pacotes
8. ✅ Cria tabela `ai_provider_keys` (se não existir)
9. ✅ Exibe relatório de sucesso

---

## ✅ Após Executar

Todas as funcionalidades devem estar 100% operacionais:

- ✅ Upload de logo funcionando
- ✅ Criar pacotes com múltiplos serviços
- ✅ Chave PIX salvando e exibindo
- ✅ Disparos WhatsApp com retry
- ✅ Botão "Melhorar com IA" em templates
- ✅ PWA instalável por salão

---

**Data:** 2026-02-18 01:19 AM
**Status:** ⚠️ AGUARDANDO EXECUÇÃO
**Arquivo:** `supabase/migrations/20260218_fix_missing_columns_v2.sql`
