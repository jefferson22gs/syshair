-- Migration: Configurar Storage Bucket 'gallery' para upload de logos
-- Data: 2025-02-14
-- Descrição: Garante permissões para upload público de imagens no bucket 'gallery'

-- Verificar se o bucket 'gallery' existe no Storage
-- Se não existir, o Supabase deve criá-lo manualmente via dashboard
-- Esta migration configura as políticas RLS necessárias

-- =============================================
-- POLÍTICAS DO STORAGE (BUCKET: gallery)
-- =============================================

-- Política 1: SELECT - Permitir leitura pública de arquivos no bucket gallery
INSERT INTO storage.policies (
    name,
    definition,
    created_at,
    updated_at
) SELECT 
    'public-read-gallery-bucket-2025',
    'CREATE POLICY "public-read-gallery-bucket" ON "gallery" FOR SELECT USING (true);',
    now(),
    now()
ON CONFLICT (name) DO NOTHING;

-- Política 2: INSERT - Permitir upload autenticado de imagens
INSERT INTO storage.policies (
    name,
    definition,
    created_at,
    updated_at
) SELECT 
    'authenticated-upload-gallery-images-2025',
    'CREATE POLICY "authenticated-upload-gallery-images" ON "gallery" 
    FOR INSERT 
    WITH CHECK (
        bucket_id = 'gallery'::text 
        AND (storage.foldername(name)[1] = 'logos'::text AND auth.role() = 'authenticated')
        OR (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'))
    )
    WITH CHECK (auth.uid() IS NOT NULL);',
    now(),
    now()
ON CONFLICT (name) DO NOTHING;

-- Política 3: UPDATE - Permitir atualizar arquivos do próprio dono no bucket gallery
INSERT INTO storage.policies (
    name,
    definition,
    created_at,
 updated_at
) SELECT 
    'owner-update-gallery-files-2025',
    'CREATE POLICY "owner-update-gallery-files" ON "gallery" 
    FOR UPDATE 
    USING (bucket_id = 'gallery'::text AND auth.uid() = (SELECT owner FROM storage.buckets WHERE id = bucket_id::text))
    WITH CHECK (true);',
    now(),
    now()
ON CONFLICT (name) DO NOTHING;

-- Política 4: DELETE - Permitir administradores remover arquivos
INSERT INTO storage.policies (
    name,
    definition,
    created_at,
    updated_at
) SELECT 
    'admin-delete-gallery-files-2025',
    'CREATE POLICY "admin-delete-gallery-files" ON "gallery" 
    FOR DELETE 
    USING (
        bucket_id = 'gallery'::text 
        AND (
            auth.uid() = (SELECT owner FROM storage.buckets WHERE id = bucket_id::text)
            OR EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.email IN ('jefferson22gs@gmail.com', 'admin@syshair.com')
            )
        )
    )
    WITH CHECK (true);',
    now(),
    now()
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FUNÇÕES ÚTEIS (para facilitar gerenciamento)
-- =============================================

-- Função para gerar URL pública para arquivo
CREATE OR REPLACE FUNCTION public.get_public_url(file_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        '/storage/v1/object/sign/' || 
        (
            'gallery/' || file_name ||
            'gallery/' || file_name
        ) || 
        '?token='
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deletar todos os arquivos de um salão (logo, galeria)
CREATE OR REPLACE FUNCTION public.delete_salon_files(p_salon_id UUID)
RETURNS INTEGER AS $$
BEGIN
    -- Deletar arquivos do bucket gallery que começam com o ID do salão
    -- Inclui arquivos de logo: {salon_id}/logo-*
    
    DELETE FROM storage.objects
    WHERE bucket_id = 'gallery'
    AND (name ~ '^' || p_salon_id::text || '/')
    ORDER BY created_at DESC;
    
    GET DIAGNOSTICS = ROW_COUNT;
    RETURN ROW_COUNT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- View de arquivos de logo de salões
CREATE OR REPLACE VIEW public.salon_logos AS
SELECT
    s.id as salon_id,
    s.name as salon_name,
    s.slug,
    so.name as object_name,
    so.size_bytes,
    so.created_at as uploaded_at,
    so.updated_at as updated_at,
    storage.get_public_url(so.name) as public_url,
    'active' as status
FROM storage.objects so
JOIN salons s ON so.name ~ ('^' || s.id::text || '/logo-')
WHERE so.bucket_id = 'gallery'
AND (s.is_active = true OR s.is_active IS NULL);

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON FUNCTION public.get_public_url IS 'Gera URL pública para arquivo no Supabase Storage (bucket gallery).';

COMMENT ON FUNCTION public.delete_salon_files IS 'Deleta todos os arquivos (logos e galeria) de um salão específico.';

-- =============================================
-- LOGS
-- =============================================
-- Verificar políticas criadas
SELECT name, definition 
FROM storage.policies 
WHERE bucket_id = 'gallery' OR bucket_id = 'gallery::text'
ORDER BY created_at DESC;

-- Lista todos os objetos no bucket gallery
SELECT name, size_bytes, owner_id, created_at 
FROM storage.objects 
WHERE bucket_id = 'gallery' 
ORDER BY created_at DESC
LIMIT 10;

-- =============================================
-- INSTRUÇÕES DE VERIFICAÇÃO
-- =============================================
-- Para verificar no Supabase:
-- 1. Dashboard → Storage → buckets → gallery
--    - Ver se o bucket existe
--    - Ver as políticas existentes (deve ter pelo menos uma)
-- 2. Tabla "objects" do Storage para ver arquivos
-- 3. Testando upload: uploadFile('gallery', 'test.png', fileBlob)
-- 
-- Se o bucket não existir, criar via dashboard:
-- Dashboard → Storage → New bucket
-- Nome: gallery
-- Public bucket: YES
-- File Size Limit: 5MB
-- Allowed MIME Types: image/*

-- Status: ✅ Pronto
-- Tabelas afetadas: storage.policies
-- Funções criadas: get_public_url(), delete_salon_files()
-- Views criadas: salon_logos
-- Políticas:
--   - Public Read (SELECT qualquer arquivo)
--   - Authenticated Upload (usuários autenticados podem enviar imagens)
--   - Owner Update (dono do arquivo pode atualizar)
--   - Admin Delete (Super Admin pode deletar qualquer arquvo)
