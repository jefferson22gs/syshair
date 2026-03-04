# 🚨 EXECUTAR ESTES 2 SCRIPTS NO SUPABASE - ORDEM CORRETA

## ⚠️ IMPORTANTE: Execute na ordem abaixo

---

## SCRIPT 1: Correções Gerais (theme_color, pix_key, bucket gallery)

### Copie e execute este script primeiro:

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
DROP POLICY IF EXISTS "Authenticated users can upload to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update gallery" ON storage.objects;

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
```

---

## SCRIPT 2: Corrigir Estrutura de Pacotes (remover service_id)

### Depois execute este script:

```sql
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
```

---

## ✅ Após Executar os 2 Scripts

Execute para verificar:

```bash
cd /d/Projetos/syshair-main
node verify-backend.mjs
```

Resultado esperado:
```
✅ Conexão: OK
✅ Tabela salons: OK
✅ Tabela service_packages: OK
✅ Tabela service_package_items: OK
✅ Storage bucket gallery: OK
```

---

## 🧪 Teste Final

1. Login como dono de salão
2. Ir em **Pacotes**
3. Clicar em **Novo Pacote**
4. Adicionar nome: "Pacote Completo"
5. Adicionar 3 serviços (ex: Corte + Barba + Sobrancelha)
6. Definir desconto: 10%
7. Clicar em **Salvar**
8. ✅ Deve salvar sem erro!

---

## 📋 O Que Foi Corrigido

### Problema Encontrado:
```
Erro ao salvar pacote: null value in column "service_id"
of relation "service_packages" violates not-null constraint
```

### Causa:
A tabela `service_packages` tinha uma coluna `service_id` com constraint NOT NULL, mas essa coluna não deveria existir.

### Estrutura Correta:
- **service_packages** (pacote) - sem service_id
  - id, salon_id, name, description, price, discount_percent, validity_days

- **service_package_items** (itens do pacote) - com service_id
  - id, package_id, service_id, quantity

### Solução:
Script 2 remove a coluna `service_id` de `service_packages`.

---

**Data:** 2026-02-18 01:31 AM
**Status:** ⚠️ AGUARDANDO EXECUÇÃO DOS 2 SCRIPTS
