-- =====================================================
-- AUTOMAÇÃO DE STATUS WHATSAPP A CADA 24H
-- Posta link público do salão nos status automaticamente
-- =====================================================

-- 1. Adicionar configurações de auto-post em salons
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_post_status_enabled BOOLEAN DEFAULT false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_post_time TIME DEFAULT '09:00:00';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_post_message TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS last_auto_post_at TIMESTAMPTZ;

-- 2. Atualizar mensagem padrão para salões
UPDATE salons
SET auto_post_message = '🎉 Agende seu horário online! 💇‍♀️✨

📱 Acesse nosso link e escolha o melhor horário para você:
👉 https://syshair.app/agendar/' || slug || '

✅ Rápido e fácil
✅ Disponível 24/7
✅ Confirmação instantânea

Estamos te esperando! 💖'
WHERE auto_post_message IS NULL AND slug IS NOT NULL;

-- 3. Criar função para gerar mensagem de status personalizada
CREATE OR REPLACE FUNCTION generate_status_message(p_salon_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_salon RECORD;
    v_message TEXT;
    v_public_url TEXT;
BEGIN
    -- Buscar dados do salão
    SELECT
        name,
        slug,
        auto_post_message,
        whatsapp
    INTO v_salon
    FROM salons
    WHERE id = p_salon_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Gerar URL pública
    v_public_url := 'https://syshair.app/agendar/' || v_salon.slug;

    -- Usar mensagem personalizada ou padrão
    IF v_salon.auto_post_message IS NOT NULL THEN
        v_message := v_salon.auto_post_message;
    ELSE
        v_message := '🎉 Agende seu horário online! 💇‍♀️✨' || E'\n\n' ||
                     '📱 Acesse nosso link:' || E'\n' ||
                     '👉 ' || v_public_url || E'\n\n' ||
                     '✅ Rápido e fácil' || E'\n' ||
                     '✅ Disponível 24/7' || E'\n' ||
                     '✅ Confirmação instantânea' || E'\n\n' ||
                     'Estamos te esperando! 💖';
    END IF;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função para verificar se deve postar status
CREATE OR REPLACE FUNCTION should_post_status(p_salon_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
    v_post_time TIME;
    v_last_post TIMESTAMPTZ;
    v_current_time TIME;
BEGIN
    -- Buscar configurações
    SELECT
        auto_post_status_enabled,
        auto_post_time,
        last_auto_post_at
    INTO v_enabled, v_post_time, v_last_post
    FROM salons
    WHERE id = p_salon_id;

    IF NOT FOUND OR NOT v_enabled THEN
        RETURN false;
    END IF;

    -- Hora atual
    v_current_time := CURRENT_TIME;

    -- Se nunca postou, pode postar
    IF v_last_post IS NULL THEN
        RETURN true;
    END IF;

    -- Se último post foi há mais de 23 horas e já passou do horário configurado
    IF v_last_post < NOW() - INTERVAL '23 hours' AND v_current_time >= v_post_time THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para processar auto-posts (chamada por cron)
CREATE OR REPLACE FUNCTION process_auto_status_posts()
RETURNS TABLE (
    salon_id UUID,
    salon_name TEXT,
    message TEXT,
    instance_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        generate_status_message(s.id),
        s.whatsapp_instance_name
    FROM salons s
    WHERE s.auto_post_status_enabled = true
      AND s.whatsapp_instance_name IS NOT NULL
      AND should_post_status(s.id) = true
      AND s.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para marcar status como postado
CREATE OR REPLACE FUNCTION mark_status_posted(p_salon_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE salons
    SET last_auto_post_at = NOW()
    WHERE id = p_salon_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar tabela de histórico de posts de status
CREATE TABLE IF NOT EXISTS status_post_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    whatsapp_status_id TEXT,
    error_message TEXT,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_status_history_salon ON status_post_history(salon_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON status_post_history(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_status ON status_post_history(status);

-- 8. Criar view para estatísticas de auto-post
CREATE OR REPLACE VIEW auto_post_stats AS
SELECT
    s.id as salon_id,
    s.name as salon_name,
    s.auto_post_status_enabled,
    s.auto_post_time,
    s.last_auto_post_at,
    COUNT(sph.id) as total_posts,
    COUNT(sph.id) FILTER (WHERE sph.status = 'sent') as successful_posts,
    COUNT(sph.id) FILTER (WHERE sph.status = 'failed') as failed_posts,
    COUNT(sph.id) FILTER (WHERE sph.posted_at >= NOW() - INTERVAL '30 days') as posts_last_30_days,
    MAX(sph.posted_at) as last_successful_post
FROM salons s
LEFT JOIN status_post_history sph ON sph.salon_id = s.id
WHERE s.auto_post_status_enabled = true
GROUP BY s.id, s.name, s.auto_post_status_enabled, s.auto_post_time, s.last_auto_post_at;

-- 9. RLS Policies
ALTER TABLE status_post_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon owners can view their status history" ON status_post_history;
CREATE POLICY "Salon owners can view their status history"
    ON status_post_history FOR SELECT
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

-- 10. Comentários
COMMENT ON COLUMN salons.auto_post_status_enabled IS 'Se auto-post de status está habilitado';
COMMENT ON COLUMN salons.auto_post_time IS 'Horário para postar status automaticamente';
COMMENT ON COLUMN salons.auto_post_message IS 'Mensagem personalizada para status';
COMMENT ON COLUMN salons.last_auto_post_at IS 'Última vez que status foi postado automaticamente';

COMMENT ON TABLE status_post_history IS 'Histórico de posts automáticos de status WhatsApp';
COMMENT ON FUNCTION process_auto_status_posts() IS 'Processa auto-posts de status (chamado por cron)';
COMMENT ON FUNCTION should_post_status(UUID) IS 'Verifica se deve postar status para o salão';

-- =====================================================
-- SUCESSO! Sistema de auto-post de status criado
-- =====================================================

SELECT 'Sistema de auto-post de status WhatsApp criado com sucesso!' as message;
