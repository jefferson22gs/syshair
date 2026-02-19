# 🚨 CORREÇÕES CRÍTICAS - EXECUTAR AGORA

## Problemas Encontrados

❌ **Coluna `theme_color` não existe** na tabela salons
❌ **Bucket `gallery` não existe** no Storage

---

## ✅ SOLUÇÃO RÁPIDA

### Passo 1: Acessar Supabase SQL Editor

1. Abra: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
2. Faça login se necessário

### Passo 2: Executar Script de Correção

Copie e cole o conteúdo do arquivo abaixo no SQL Editor:

**Arquivo:** `supabase/migrations/20260218_fix_missing_columns.sql`

Ou copie diretamente este script:

```sql
-- CORREÇÃO CRÍTICA: Adicionar colunas faltantes e criar bucket gallery

-- 1. ADICIONAR COLUNA THEME_COLOR
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#c9a227';

-- 2. ADICIONAR COLUNA PIX_KEY
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- 3. ADICIONAR COLUNA LOGO_URL
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

-- 9. RELATÓRIO FINAL
DO $$
DECLARE
    salons_count INTEGER;
    has_theme_color BOOLEAN;
    has_pix_key BOOLEAN;
    has_logo_url BOOLEAN;
BEGIN
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
```

### Passo 3: Clicar em "RUN"

Aguarde a execução. Você verá mensagens de sucesso no painel de resultados.

### Passo 4: Verificar Bucket Gallery

1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/storage/buckets
2. Confirme que o bucket `gallery` aparece na lista
3. Verifique se está marcado como "Public"

---

## 🔄 Verificar Novamente

Após executar o script, rode novamente a verificação:

```bash
cd /d/Projetos/syshair-main
node verify-backend.mjs
```

Você deve ver:
- ✅ Tabela salons: OK
- ✅ Storage bucket gallery: OK

---

## 📋 Checklist Pós-Correção

Após executar o script SQL, teste as funcionalidades:

### 1. Upload de Logo
1. Login como dono de salão
2. Ir em Configurações
3. Upload de logo (PNG/JPG)
4. ✅ Deve salvar sem erro

### 2. Criar Pacote
1. Login como dono de salão
2. Ir em Pacotes
3. Criar pacote com 3 serviços
4. ✅ Deve salvar sem erro

### 3. Configurar PIX
1. Login como dono de salão
2. Ir em Configurações
3. Adicionar chave PIX
4. Salvar
5. ✅ Deve salvar sem erro

### 4. Testar Agendamento Público
1. Abrir link: https://syshair.vercel.app/s/[seu-slug]
2. Fazer agendamento completo
3. ✅ PIX deve aparecer na confirmação

### 5. Configurar IA (Opcional)
1. Login como super admin (jefferson22gs@gmail.com)
2. Ir em Super Admin → IA
3. Adicionar chave OpenAI ou Groq
4. Marcar como ativa
5. ✅ Botão "Melhorar com IA" deve funcionar

---

## 🎯 Resultado Esperado

Após executar o script, todas as funcionalidades devem estar 100% operacionais:

✅ Upload de logo funcionando
✅ Criar pacotes com múltiplos serviços funcionando
✅ Chave PIX salvando e exibindo
✅ Disparos WhatsApp com retry e validação
✅ Botão "Melhorar com IA" em templates
✅ PWA instalável por salão
✅ Todas as tabelas e colunas corretas

---

## 📞 Suporte

Se encontrar algum erro ao executar o script:

1. Copie a mensagem de erro completa
2. Tire um print da tela
3. Entre em contato:
   - WhatsApp: +55 11 98626-2240
   - Instagram: @codigo.base

---

**Data:** 2026-02-18 01:09 AM
**Status:** ⚠️ AGUARDANDO EXECUÇÃO DO SCRIPT SQL
**Prioridade:** 🚨 CRÍTICA
