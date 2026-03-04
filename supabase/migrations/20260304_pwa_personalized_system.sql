-- =====================================================
-- SISTEMA DE PWA PERSONALIZADO POR SALÃO
-- Permite que cada salão tenha seu próprio PWA instalável
-- =====================================================

-- 1. Adicionar colunas para personalização do PWA
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_name TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_short_name TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_description TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_theme_color TEXT DEFAULT '#c9a227';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_background_color TEXT DEFAULT '#0d1117';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_icon_url TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pwa_enabled BOOLEAN DEFAULT true;

-- 2. Atualizar salões existentes com valores padrão
UPDATE salons
SET
    pwa_name = name || ' - Agendamento',
    pwa_short_name = LEFT(name, 12),
    pwa_description = 'Agende seus horários em ' || name,
    pwa_theme_color = COALESCE(primary_color, '#c9a227'),
    pwa_background_color = '#0d1117'
WHERE pwa_name IS NULL;

-- 3. Criar função para gerar manifest.json dinâmico
CREATE OR REPLACE FUNCTION get_salon_pwa_manifest(p_salon_slug TEXT)
RETURNS JSON AS $$
DECLARE
    v_salon RECORD;
    v_manifest JSON;
BEGIN
    -- Buscar dados do salão
    SELECT
        id,
        name,
        slug,
        pwa_name,
        pwa_short_name,
        pwa_description,
        pwa_theme_color,
        pwa_background_color,
        pwa_icon_url,
        logo_url
    INTO v_salon
    FROM salons
    WHERE slug = p_salon_slug
      AND is_active = true
      AND pwa_enabled = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'error', 'Salão não encontrado ou PWA desabilitado'
        );
    END IF;

    -- Gerar manifest
    v_manifest := json_build_object(
        'name', COALESCE(v_salon.pwa_name, v_salon.name || ' - Agendamento'),
        'short_name', COALESCE(v_salon.pwa_short_name, LEFT(v_salon.name, 12)),
        'description', COALESCE(v_salon.pwa_description, 'Agende seus horários'),
        'start_url', '/agendar/' || v_salon.slug || '?source=pwa',
        'scope', '/agendar/' || v_salon.slug || '/',
        'display', 'standalone',
        'orientation', 'portrait',
        'theme_color', COALESCE(v_salon.pwa_theme_color, '#c9a227'),
        'background_color', COALESCE(v_salon.pwa_background_color, '#0d1117'),
        'icons', json_build_array(
            json_build_object(
                'src', COALESCE(v_salon.pwa_icon_url, v_salon.logo_url, '/pwa-192x192.png'),
                'sizes', '192x192',
                'type', 'image/png',
                'purpose', 'any maskable'
            ),
            json_build_object(
                'src', COALESCE(v_salon.pwa_icon_url, v_salon.logo_url, '/pwa-512x512.png'),
                'sizes', '512x512',
                'type', 'image/png',
                'purpose', 'any maskable'
            )
        ),
        'categories', json_build_array('beauty', 'lifestyle', 'business'),
        'screenshots', json_build_array(),
        'shortcuts', json_build_array(
            json_build_object(
                'name', 'Novo Agendamento',
                'short_name', 'Agendar',
                'description', 'Fazer novo agendamento',
                'url', '/agendar/' || v_salon.slug,
                'icons', json_build_array(
                    json_build_object(
                        'src', '/pwa-192x192.png',
                        'sizes', '192x192'
                    )
                )
            ),
            json_build_object(
                'name', 'Meus Agendamentos',
                'short_name', 'Agendamentos',
                'description', 'Ver meus agendamentos',
                'url', '/agendar/' || v_salon.slug || '/meus-agendamentos',
                'icons', json_build_array(
                    json_build_object(
                        'src', '/pwa-192x192.png',
                        'sizes', '192x192'
                    )
                )
            )
        )
    );

    RETURN v_manifest;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar tabela para rastrear instalações de PWA
CREATE TABLE IF NOT EXISTS pwa_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    client_phone TEXT,
    client_name TEXT,
    device_info JSONB,
    user_agent TEXT,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_opened_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pwa_installations_salon ON pwa_installations(salon_id);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_phone ON pwa_installations(client_phone);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_active ON pwa_installations(is_active) WHERE is_active = true;

-- 5. Criar função para registrar instalação de PWA
CREATE OR REPLACE FUNCTION register_pwa_installation(
    p_salon_id UUID,
    p_client_phone TEXT DEFAULT NULL,
    p_client_name TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_installation_id UUID;
BEGIN
    -- Verificar se já existe instalação ativa para este cliente
    IF p_client_phone IS NOT NULL THEN
        SELECT id INTO v_installation_id
        FROM pwa_installations
        WHERE salon_id = p_salon_id
          AND client_phone = p_client_phone
          AND is_active = true;

        IF FOUND THEN
            -- Atualizar última abertura
            UPDATE pwa_installations
            SET last_opened_at = NOW()
            WHERE id = v_installation_id;

            RETURN v_installation_id;
        END IF;
    END IF;

    -- Criar nova instalação
    INSERT INTO pwa_installations (
        salon_id,
        client_phone,
        client_name,
        device_info,
        user_agent
    ) VALUES (
        p_salon_id,
        p_client_phone,
        p_client_name,
        p_device_info,
        p_user_agent
    )
    RETURNING id INTO v_installation_id;

    RETURN v_installation_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar view para estatísticas de PWA
CREATE OR REPLACE VIEW pwa_stats AS
SELECT
    s.id as salon_id,
    s.name as salon_name,
    s.slug,
    COUNT(pi.id) as total_installations,
    COUNT(pi.id) FILTER (WHERE pi.is_active = true) as active_installations,
    COUNT(pi.id) FILTER (WHERE pi.installed_at >= NOW() - INTERVAL '7 days') as installations_last_7_days,
    COUNT(pi.id) FILTER (WHERE pi.installed_at >= NOW() - INTERVAL '30 days') as installations_last_30_days,
    COUNT(pi.id) FILTER (WHERE pi.last_opened_at >= NOW() - INTERVAL '7 days') as active_users_7_days,
    MAX(pi.installed_at) as last_installation_at
FROM salons s
LEFT JOIN pwa_installations pi ON pi.salon_id = s.id
WHERE s.pwa_enabled = true
GROUP BY s.id, s.name, s.slug;

-- 7. RLS Policies
ALTER TABLE pwa_installations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon owners can view their PWA installations" ON pwa_installations;
CREATE POLICY "Salon owners can view their PWA installations"
    ON pwa_installations FOR SELECT
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can register PWA installation" ON pwa_installations;
CREATE POLICY "Anyone can register PWA installation"
    ON pwa_installations FOR INSERT
    WITH CHECK (true);

-- 8. Comentários
COMMENT ON TABLE pwa_installations IS 'Rastreamento de instalações de PWA por salão';
COMMENT ON COLUMN salons.pwa_name IS 'Nome completo do PWA (aparece na tela inicial)';
COMMENT ON COLUMN salons.pwa_short_name IS 'Nome curto do PWA (máx 12 caracteres)';
COMMENT ON COLUMN salons.pwa_enabled IS 'Se o PWA está habilitado para este salão';

COMMENT ON FUNCTION get_salon_pwa_manifest(TEXT) IS 'Gera manifest.json dinâmico para PWA do salão';
COMMENT ON FUNCTION register_pwa_installation(UUID, TEXT, TEXT, JSONB, TEXT) IS 'Registra instalação de PWA';

-- =====================================================
-- SUCESSO! Sistema de PWA personalizado criado
-- =====================================================

SELECT 'Sistema de PWA personalizado criado com sucesso!' as message;
