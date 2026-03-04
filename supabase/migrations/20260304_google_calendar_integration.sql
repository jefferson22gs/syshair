-- =====================================================
-- INTEGRAÇÃO COM GOOGLE CALENDAR
-- Permite sincronizar agendamentos com Google Calendar
-- =====================================================

-- 1. Criar tabela para armazenar tokens OAuth do Google
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    calendar_id TEXT, -- ID do calendário principal
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_google_tokens_salon ON google_calendar_tokens(salon_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_user ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_active ON google_calendar_tokens(is_active) WHERE is_active = true;

-- 2. Adicionar colunas em appointments para rastrear sincronização
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_sync_enabled BOOLEAN DEFAULT true;

-- 3. Criar tabela de configurações de sincronização
CREATE TABLE IF NOT EXISTS google_calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE UNIQUE,
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_google', 'from_google', 'both')),
    calendar_name TEXT DEFAULT 'SysHair - Agendamentos',
    reminder_minutes INTEGER DEFAULT 60, -- Lembrete 1h antes
    send_notifications BOOLEAN DEFAULT true,
    sync_cancelled BOOLEAN DEFAULT false, -- Se deve sincronizar cancelados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar função para verificar se token está válido
CREATE OR REPLACE FUNCTION is_google_token_valid(p_salon_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_is_active BOOLEAN;
BEGIN
    SELECT expires_at, is_active
    INTO v_expires_at, v_is_active
    FROM google_calendar_tokens
    WHERE salon_id = p_salon_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF NOT v_is_active THEN
        RETURN false;
    END IF;

    -- Token válido se expira em mais de 5 minutos
    IF v_expires_at > NOW() + INTERVAL '5 minutes' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para marcar agendamento para sincronização
CREATE OR REPLACE FUNCTION mark_appointment_for_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_sync_enabled BOOLEAN;
BEGIN
    -- Verificar se sincronização está habilitada para o salão
    SELECT auto_sync_enabled INTO v_sync_enabled
    FROM google_calendar_settings
    WHERE salon_id = NEW.salon_id;

    IF v_sync_enabled IS NULL THEN
        v_sync_enabled := false;
    END IF;

    -- Se sincronização habilitada e token válido
    IF v_sync_enabled AND is_google_token_valid(NEW.salon_id) THEN
        -- Marcar para sincronização (será processado por Edge Function)
        INSERT INTO notifications (
            salon_id,
            appointment_id,
            type,
            channel,
            title,
            message,
            status
        ) VALUES (
            NEW.salon_id,
            NEW.id,
            'google_calendar_sync',
            'system',
            'Sincronizar com Google Calendar',
            'Agendamento precisa ser sincronizado',
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar triggers para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_appointment_insert ON appointments;
CREATE TRIGGER trigger_sync_appointment_insert
    AFTER INSERT ON appointments
    FOR EACH ROW
    WHEN (NEW.google_sync_enabled = true)
    EXECUTE FUNCTION mark_appointment_for_sync();

DROP TRIGGER IF EXISTS trigger_sync_appointment_update ON appointments;
CREATE TRIGGER trigger_sync_appointment_update
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (
        NEW.google_sync_enabled = true AND
        (OLD.date != NEW.date OR
         OLD.start_time != NEW.start_time OR
         OLD.status != NEW.status)
    )
    EXECUTE FUNCTION mark_appointment_for_sync();

-- 7. Criar view para status de sincronização
CREATE OR REPLACE VIEW google_calendar_sync_status AS
SELECT
    s.id as salon_id,
    s.name as salon_name,
    gct.is_active as has_valid_token,
    gct.expires_at as token_expires_at,
    gcs.auto_sync_enabled,
    gcs.sync_direction,
    COUNT(a.id) as total_appointments,
    COUNT(a.id) FILTER (WHERE a.google_event_id IS NOT NULL) as synced_appointments,
    COUNT(a.id) FILTER (WHERE a.google_event_id IS NULL AND a.google_sync_enabled = true) as pending_sync
FROM salons s
LEFT JOIN google_calendar_tokens gct ON gct.salon_id = s.id AND gct.is_active = true
LEFT JOIN google_calendar_settings gcs ON gcs.salon_id = s.id
LEFT JOIN appointments a ON a.salon_id = s.id AND a.status NOT IN ('cancelled', 'completed')
GROUP BY s.id, s.name, gct.is_active, gct.expires_at, gcs.auto_sync_enabled, gcs.sync_direction;

-- 8. Criar função para gerar link de autorização OAuth
CREATE OR REPLACE FUNCTION get_google_oauth_url(p_salon_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_client_id TEXT;
    v_redirect_uri TEXT;
    v_scope TEXT;
    v_state TEXT;
    v_url TEXT;
BEGIN
    -- Configurações OAuth (devem estar nas variáveis de ambiente)
    v_client_id := current_setting('app.google_client_id', true);
    v_redirect_uri := current_setting('app.base_url', true) || '/api/google-calendar/callback';
    v_scope := 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
    v_state := encode(gen_random_bytes(32), 'hex') || ':' || p_salon_id::TEXT;

    -- Construir URL
    v_url := 'https://accounts.google.com/o/oauth2/v2/auth' ||
             '?client_id=' || v_client_id ||
             '&redirect_uri=' || v_redirect_uri ||
             '&response_type=code' ||
             '&scope=' || v_scope ||
             '&access_type=offline' ||
             '&prompt=consent' ||
             '&state=' || v_state;

    RETURN v_url;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS Policies
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon owners can manage their Google tokens" ON google_calendar_tokens;
CREATE POLICY "Salon owners can manage their Google tokens"
    ON google_calendar_tokens FOR ALL
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Salon owners can manage their Google settings" ON google_calendar_settings;
CREATE POLICY "Salon owners can manage their Google settings"
    ON google_calendar_settings FOR ALL
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

-- 10. Comentários
COMMENT ON TABLE google_calendar_tokens IS 'Tokens OAuth2 para integração com Google Calendar';
COMMENT ON TABLE google_calendar_settings IS 'Configurações de sincronização com Google Calendar';
COMMENT ON COLUMN appointments.google_event_id IS 'ID do evento no Google Calendar';
COMMENT ON COLUMN appointments.google_sync_enabled IS 'Se este agendamento deve ser sincronizado';

COMMENT ON FUNCTION is_google_token_valid(UUID) IS 'Verifica se token do Google está válido';
COMMENT ON FUNCTION get_google_oauth_url(UUID) IS 'Gera URL para autorização OAuth do Google';

-- =====================================================
-- SUCESSO! Sistema de integração Google Calendar criado
-- =====================================================

SELECT 'Sistema de integração Google Calendar criado com sucesso!' as message;
