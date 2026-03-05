-- =====================================================
-- SISTEMA DE POSTAGEM AUTOMÁTICA NO STATUS WHATSAPP
-- Posta link público do salão a cada 24 horas
-- Data: 2026-03-05
-- =====================================================

-- 1. Criar tabela para controlar postagens de status
CREATE TABLE IF NOT EXISTS whatsapp_status_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    status_text TEXT NOT NULL,
    status_image_url TEXT,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_status_posts_salon_posted
ON whatsapp_status_posts(salon_id, posted_at DESC);

-- 3. Adicionar configuração de status automático na tabela salons
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_status_enabled BOOLEAN DEFAULT true;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_status_message TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auto_status_image_url TEXT;

-- 4. Criar função para postar status automaticamente
CREATE OR REPLACE FUNCTION post_salon_status_auto()
RETURNS JSON AS $$
DECLARE
    v_salon RECORD;
    v_last_post TIMESTAMPTZ;
    v_should_post BOOLEAN;
    v_status_text TEXT;
    v_result JSON;
    v_posted_count INTEGER := 0;
BEGIN
    -- Iterar sobre todos os salões com auto status habilitado
    FOR v_salon IN
        SELECT
            s.id,
            s.name,
            s.slug,
            s.auto_status_message,
            s.auto_status_image_url,
            wi.instance_name
        FROM salons s
        LEFT JOIN whatsapp_instances wi ON wi.salon_id = s.id
        WHERE s.auto_status_enabled = true
        AND s.public_booking_enabled = true
        AND wi.instance_name IS NOT NULL
        AND wi.status = 'connected'
    LOOP
        -- Verificar última postagem
        SELECT posted_at INTO v_last_post
        FROM whatsapp_status_posts
        WHERE salon_id = v_salon.id
        AND success = true
        ORDER BY posted_at DESC
        LIMIT 1;

        -- Verificar se já se passaram 24 horas
        v_should_post := (v_last_post IS NULL) OR (NOW() - v_last_post >= INTERVAL '24 hours');

        IF v_should_post THEN
            -- Montar mensagem de status
            v_status_text := COALESCE(
                v_salon.auto_status_message,
                '✨ Agende seu horário online! 💇‍♀️' || E'\n\n' ||
                '📱 Acesse: https://syshair.vercel.app/s/' || v_salon.slug || E'\n\n' ||
                '🎯 Rápido, fácil e sem complicação!' || E'\n' ||
                '⏰ Disponível 24h por dia'
            );

            -- Registrar postagem (será processada pela Edge Function)
            INSERT INTO whatsapp_status_posts (
                salon_id,
                status_text,
                status_image_url,
                success
            ) VALUES (
                v_salon.id,
                v_status_text,
                v_salon.auto_status_image_url,
                false -- Será atualizado pela Edge Function
            );

            v_posted_count := v_posted_count + 1;
        END IF;
    END LOOP;

    v_result := json_build_object(
        'success', true,
        'salons_processed', v_posted_count,
        'message', 'Status posts scheduled for ' || v_posted_count || ' salon(s)'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar cron job para executar a cada hora (verifica se já passaram 24h)
SELECT cron.schedule(
    'post_salon_status_every_hour',
    '0 * * * *', -- A cada hora no minuto 0
    $$
    SELECT net.http_post(
        url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-post-status',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 6. Habilitar auto status para todos os salões ativos
UPDATE salons
SET auto_status_enabled = true
WHERE public_booking_enabled = true;

-- 7. Verificar configuração
SELECT
    s.name,
    s.slug,
    s.auto_status_enabled,
    wi.instance_name,
    wi.status as whatsapp_status,
    CASE
        WHEN wi.instance_name IS NULL THEN '❌ Sem instância WhatsApp'
        WHEN wi.status != 'connected' THEN '⚠️ WhatsApp desconectado'
        WHEN s.auto_status_enabled = false THEN '⚠️ Auto status desabilitado'
        ELSE '✅ Configurado'
    END as status_config
FROM salons s
LEFT JOIN whatsapp_instances wi ON wi.salon_id = s.id
WHERE s.public_booking_enabled = true;

SELECT '✅ Sistema de postagem automática configurado! Postará a cada 24 horas.' as message;
