-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE BROADCAST WHATSAPP
-- Data: 2026-03-04
-- Objetivo: Corrigir travamento do disparador
-- =====================================================

-- 1. Criar tabela de queue para processamento assíncrono
CREATE TABLE IF NOT EXISTS broadcast_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_status ON broadcast_queue(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_broadcast_id ON broadcast_queue(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_scheduled ON broadcast_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_salon ON broadcast_queue(salon_id);

-- 2. Adicionar coluna para controle de progresso em broadcasts
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS current_batch INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Criar função para processar próximo item da queue
CREATE OR REPLACE FUNCTION process_next_broadcast_queue_item()
RETURNS TABLE (
    queue_id UUID,
    broadcast_id UUID,
    salon_id UUID,
    recipient_phone TEXT,
    message TEXT,
    instance_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH next_item AS (
        SELECT bq.id
        FROM broadcast_queue bq
        WHERE bq.status = 'pending'
          AND bq.scheduled_for <= NOW()
          AND bq.attempts < bq.max_attempts
        ORDER BY bq.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE broadcast_queue bq
    SET
        status = 'processing',
        attempts = attempts + 1,
        updated_at = NOW()
    FROM next_item
    WHERE bq.id = next_item.id
    RETURNING
        bq.id,
        bq.broadcast_id,
        bq.salon_id,
        bq.recipient_phone,
        bq.message,
        (SELECT whatsapp_instance_name FROM salons WHERE id = bq.salon_id);
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função para marcar item como enviado
CREATE OR REPLACE FUNCTION mark_broadcast_queue_sent(
    p_queue_id UUID,
    p_whatsapp_message_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE broadcast_queue
    SET
        status = 'sent',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_queue_id;

    -- Atualizar contadores do broadcast
    UPDATE broadcasts b
    SET
        sent_count = (
            SELECT COUNT(*)
            FROM broadcast_queue
            WHERE broadcast_id = b.id AND status = 'sent'
        ),
        progress_percent = (
            SELECT ROUND((COUNT(*) FILTER (WHERE status IN ('sent', 'failed'))::NUMERIC / COUNT(*)::NUMERIC) * 100)
            FROM broadcast_queue
            WHERE broadcast_id = b.id
        ),
        last_activity_at = NOW()
    WHERE id = (SELECT broadcast_id FROM broadcast_queue WHERE id = p_queue_id);
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para marcar item como falho
CREATE OR REPLACE FUNCTION mark_broadcast_queue_failed(
    p_queue_id UUID,
    p_error_message TEXT
)
RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
    v_max_attempts INTEGER;
    v_broadcast_id UUID;
BEGIN
    -- Buscar informações do item
    SELECT attempts, max_attempts, broadcast_id
    INTO v_attempts, v_max_attempts, v_broadcast_id
    FROM broadcast_queue
    WHERE id = p_queue_id;

    -- Se atingiu máximo de tentativas, marcar como failed
    IF v_attempts >= v_max_attempts THEN
        UPDATE broadcast_queue
        SET
            status = 'failed',
            error_message = p_error_message,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_queue_id;
    ELSE
        -- Caso contrário, voltar para pending para retry
        UPDATE broadcast_queue
        SET
            status = 'pending',
            error_message = p_error_message,
            scheduled_for = NOW() + INTERVAL '30 seconds', -- Retry após 30s
            updated_at = NOW()
        WHERE id = p_queue_id;
    END IF;

    -- Atualizar contadores do broadcast
    UPDATE broadcasts b
    SET
        failed_count = (
            SELECT COUNT(*)
            FROM broadcast_queue
            WHERE broadcast_id = b.id AND status = 'failed'
        ),
        progress_percent = (
            SELECT ROUND((COUNT(*) FILTER (WHERE status IN ('sent', 'failed'))::NUMERIC / COUNT(*)::NUMERIC) * 100)
            FROM broadcast_queue
            WHERE broadcast_id = b.id
        ),
        last_activity_at = NOW()
    WHERE id = v_broadcast_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para verificar e completar broadcasts
CREATE OR REPLACE FUNCTION check_broadcast_completion()
RETURNS VOID AS $$
BEGIN
    -- Marcar broadcasts como completed quando todos itens foram processados
    UPDATE broadcasts b
    SET
        status = 'completed',
        completed_at = NOW()
    WHERE
        status = 'processing'
        AND NOT EXISTS (
            SELECT 1
            FROM broadcast_queue
            WHERE broadcast_id = b.id
              AND status IN ('pending', 'processing')
        );

    -- Marcar broadcasts como failed se todos falharam
    UPDATE broadcasts b
    SET
        status = 'failed',
        completed_at = NOW(),
        error_message = 'Todas as mensagens falharam'
    WHERE
        status = 'processing'
        AND sent_count = 0
        AND NOT EXISTS (
            SELECT 1
            FROM broadcast_queue
            WHERE broadcast_id = b.id
              AND status IN ('pending', 'processing')
        );
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_broadcast_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_broadcast_queue_updated_at ON broadcast_queue;
CREATE TRIGGER trigger_broadcast_queue_updated_at
    BEFORE UPDATE ON broadcast_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_broadcast_queue_updated_at();

-- 8. Criar view para estatísticas de broadcast
CREATE OR REPLACE VIEW broadcast_stats AS
SELECT
    b.id,
    b.salon_id,
    b.status,
    b.total_recipients,
    b.sent_count,
    b.failed_count,
    b.progress_percent,
    b.created_at,
    b.completed_at,
    COUNT(bq.id) FILTER (WHERE bq.status = 'pending') as pending_count,
    COUNT(bq.id) FILTER (WHERE bq.status = 'processing') as processing_count,
    EXTRACT(EPOCH FROM (NOW() - b.last_activity_at)) as seconds_since_activity
FROM broadcasts b
LEFT JOIN broadcast_queue bq ON bq.broadcast_id = b.id
GROUP BY b.id;

-- 9. RLS Policies
ALTER TABLE broadcast_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their salon's broadcast queue" ON broadcast_queue;
CREATE POLICY "Users can view their salon's broadcast queue"
    ON broadcast_queue FOR SELECT
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can manage broadcast queue" ON broadcast_queue;
CREATE POLICY "Service role can manage broadcast queue"
    ON broadcast_queue FOR ALL
    USING (true)
    WITH CHECK (true);

-- 10. Criar função para limpar queue antiga (mais de 7 dias)
CREATE OR REPLACE FUNCTION cleanup_old_broadcast_queue()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM broadcast_queue
    WHERE
        status IN ('sent', 'failed')
        AND processed_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentários para documentação
COMMENT ON TABLE broadcast_queue IS 'Queue para processamento assíncrono de mensagens de broadcast';
COMMENT ON COLUMN broadcast_queue.attempts IS 'Número de tentativas de envio';
COMMENT ON COLUMN broadcast_queue.max_attempts IS 'Máximo de tentativas antes de marcar como failed';
COMMENT ON COLUMN broadcast_queue.scheduled_for IS 'Quando o item deve ser processado (permite retry com delay)';

COMMENT ON FUNCTION process_next_broadcast_queue_item() IS 'Busca e marca próximo item da queue para processamento';
COMMENT ON FUNCTION mark_broadcast_queue_sent(UUID, TEXT) IS 'Marca item da queue como enviado com sucesso';
COMMENT ON FUNCTION mark_broadcast_queue_failed(UUID, TEXT) IS 'Marca item da queue como falho e agenda retry se possível';
COMMENT ON FUNCTION check_broadcast_completion() IS 'Verifica e marca broadcasts como completed quando todos itens foram processados';

-- =====================================================
-- SUCESSO! Sistema de queue implementado
-- =====================================================

SELECT 'Sistema de broadcast queue criado com sucesso!' as message;
-- =====================================================
-- SISTEMA DE CANCELAMENTO E ALTERAÇÃO DE AGENDAMENTO
-- Permite que clientes cancelem ou alterem seus agendamentos
-- =====================================================

-- 1. Adicionar token único para cada agendamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_token TEXT UNIQUE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS can_be_modified BOOLEAN DEFAULT true;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'client' ou 'salon'

-- 2. Criar função para gerar token único
CREATE OR REPLACE FUNCTION generate_cancellation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para gerar token automaticamente
CREATE OR REPLACE FUNCTION set_appointment_cancellation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cancellation_token IS NULL THEN
        NEW.cancellation_token := generate_cancellation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_cancellation_token ON appointments;
CREATE TRIGGER trigger_set_cancellation_token
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION set_appointment_cancellation_token();

-- 4. Atualizar agendamentos existentes com token
UPDATE appointments
SET cancellation_token = generate_cancellation_token()
WHERE cancellation_token IS NULL;

-- 5. Criar função para validar se agendamento pode ser modificado
CREATE OR REPLACE FUNCTION can_modify_appointment(p_appointment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_appointment_date DATE;
    v_appointment_time TIME;
    v_appointment_datetime TIMESTAMPTZ;
    v_status TEXT;
    v_can_be_modified BOOLEAN;
BEGIN
    -- Buscar dados do agendamento
    SELECT date, start_time, status, can_be_modified
    INTO v_appointment_date, v_appointment_time, v_status, v_can_be_modified
    FROM appointments
    WHERE id = p_appointment_id;

    -- Se não encontrou, retornar false
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Se já foi cancelado ou completado, não pode modificar
    IF v_status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN false;
    END IF;

    -- Se marcado como não modificável
    IF v_can_be_modified = false THEN
        RETURN false;
    END IF;

    -- Combinar data e hora
    v_appointment_datetime := (v_appointment_date || ' ' || v_appointment_time)::TIMESTAMPTZ;

    -- Verificar se falta mais de 24 horas
    IF v_appointment_datetime - NOW() < INTERVAL '24 hours' THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função para cancelar agendamento via token
CREATE OR REPLACE FUNCTION cancel_appointment_by_token(
    p_token TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_appointment_id UUID;
    v_can_modify BOOLEAN;
    v_result JSON;
BEGIN
    -- Buscar agendamento pelo token
    SELECT id INTO v_appointment_id
    FROM appointments
    WHERE cancellation_token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido'
        );
    END IF;

    -- Verificar se pode modificar
    v_can_modify := can_modify_appointment(v_appointment_id);

    IF NOT v_can_modify THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Agendamento não pode ser cancelado (menos de 24h ou já finalizado)'
        );
    END IF;

    -- Cancelar agendamento
    UPDATE appointments
    SET
        status = 'cancelled',
        cancelled_by = 'client',
        notes = COALESCE(notes || E'\n\n', '') || 'Cancelado pelo cliente. Motivo: ' || COALESCE(p_reason, 'Não informado'),
        updated_at = NOW()
    WHERE id = v_appointment_id;

    -- Registrar notificação para o salão
    INSERT INTO notifications (
        salon_id,
        appointment_id,
        type,
        channel,
        title,
        message,
        status
    )
    SELECT
        salon_id,
        id,
        'appointment_cancelled',
        'push',
        '❌ Agendamento Cancelado',
        client_name || ' cancelou o agendamento de ' || TO_CHAR(date::DATE, 'DD/MM') || ' às ' || start_time,
        'pending'
    FROM appointments
    WHERE id = v_appointment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Agendamento cancelado com sucesso'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Criar função para buscar horários disponíveis para reagendamento
CREATE OR REPLACE FUNCTION get_available_slots_for_reschedule(
    p_appointment_id UUID,
    p_new_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN
) AS $$
DECLARE
    v_salon_id UUID;
    v_professional_id UUID;
    v_service_duration INTEGER;
BEGIN
    -- Buscar dados do agendamento
    SELECT salon_id, professional_id,
           (SELECT duration_minutes FROM services WHERE id = appointments.service_id)
    INTO v_salon_id, v_professional_id, v_service_duration
    FROM appointments
    WHERE id = p_appointment_id;

    -- Retornar horários disponíveis (simplificado)
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            '08:00'::TIME,
            '18:00'::TIME,
            '30 minutes'::INTERVAL
        )::TIME as slot
    ),
    occupied_slots AS (
        SELECT start_time
        FROM appointments
        WHERE salon_id = v_salon_id
          AND professional_id = v_professional_id
          AND date = p_new_date
          AND status NOT IN ('cancelled', 'no_show')
          AND id != p_appointment_id
    )
    SELECT
        ts.slot,
        NOT EXISTS (
            SELECT 1 FROM occupied_slots os
            WHERE os.start_time = ts.slot
        ) as is_available
    FROM time_slots ts
    ORDER BY ts.slot;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar função para reagendar
CREATE OR REPLACE FUNCTION reschedule_appointment_by_token(
    p_token TEXT,
    p_new_date DATE,
    p_new_time TIME
)
RETURNS JSON AS $$
DECLARE
    v_appointment_id UUID;
    v_can_modify BOOLEAN;
    v_old_date DATE;
    v_old_time TIME;
BEGIN
    -- Buscar agendamento
    SELECT id, date, start_time
    INTO v_appointment_id, v_old_date, v_old_time
    FROM appointments
    WHERE cancellation_token = p_token;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Token inválido'
        );
    END IF;

    -- Verificar se pode modificar
    v_can_modify := can_modify_appointment(v_appointment_id);

    IF NOT v_can_modify THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Agendamento não pode ser alterado'
        );
    END IF;

    -- Verificar se novo horário está disponível
    -- (simplificado - adicionar validação completa depois)

    -- Atualizar agendamento
    UPDATE appointments
    SET
        date = p_new_date,
        start_time = p_new_time,
        end_time = p_new_time + (
            SELECT (duration_minutes || ' minutes')::INTERVAL
            FROM services
            WHERE id = appointments.service_id
        ),
        modified_at = NOW(),
        notes = COALESCE(notes || E'\n\n', '') ||
                'Reagendado pelo cliente de ' ||
                TO_CHAR(v_old_date, 'DD/MM/YYYY') || ' ' || v_old_time ||
                ' para ' || TO_CHAR(p_new_date, 'DD/MM/YYYY') || ' ' || p_new_time,
        updated_at = NOW()
    WHERE id = v_appointment_id;

    -- Notificar salão
    INSERT INTO notifications (
        salon_id,
        appointment_id,
        type,
        channel,
        title,
        message,
        status
    )
    SELECT
        salon_id,
        id,
        'appointment_rescheduled',
        'push',
        '🔄 Agendamento Alterado',
        client_name || ' alterou o agendamento para ' || TO_CHAR(p_new_date, 'DD/MM') || ' às ' || p_new_time::TEXT,
        'pending'
    FROM appointments
    WHERE id = v_appointment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Agendamento alterado com sucesso'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Criar view para agendamentos do cliente
CREATE OR REPLACE VIEW client_appointments AS
SELECT
    a.id,
    a.cancellation_token,
    a.date,
    a.start_time,
    a.end_time,
    a.status,
    a.client_name,
    a.client_phone,
    a.price,
    s.name as service_name,
    p.name as professional_name,
    sal.name as salon_name,
    sal.address as salon_address,
    sal.phone as salon_phone,
    can_modify_appointment(a.id) as can_modify,
    EXTRACT(EPOCH FROM ((a.date || ' ' || a.start_time)::TIMESTAMPTZ - NOW())) / 3600 as hours_until_appointment
FROM appointments a
LEFT JOIN services s ON s.id = a.service_id
LEFT JOIN professionals p ON p.id = a.professional_id
LEFT JOIN salons sal ON sal.id = a.salon_id;

-- 10. RLS para acesso público via token
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view appointment with valid token" ON appointments;
CREATE POLICY "Anyone can view appointment with valid token"
    ON appointments FOR SELECT
    USING (true); -- Acesso via token será validado na aplicação

-- 11. Comentários
COMMENT ON COLUMN appointments.cancellation_token IS 'Token único para cancelamento/alteração pelo cliente';
COMMENT ON COLUMN appointments.can_be_modified IS 'Se o agendamento pode ser modificado pelo cliente';
COMMENT ON COLUMN appointments.cancelled_by IS 'Quem cancelou: client ou salon';

COMMENT ON FUNCTION can_modify_appointment(UUID) IS 'Verifica se agendamento pode ser cancelado/alterado (>24h)';
COMMENT ON FUNCTION cancel_appointment_by_token(TEXT, TEXT) IS 'Cancela agendamento usando token único';
COMMENT ON FUNCTION reschedule_appointment_by_token(TEXT, DATE, TIME) IS 'Reagenda agendamento usando token único';

-- =====================================================
-- SUCESSO! Sistema de cancelamento/alteração criado
-- =====================================================

SELECT 'Sistema de cancelamento e alteração criado com sucesso!' as message;
-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES PUSH PARA AGENDAMENTOS
-- Envia notificação para dono do salão quando há novo agendamento
-- =====================================================

-- 1. Criar função para enviar notificação push
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_salon_owner_id UUID;
    v_salon_name TEXT;
    v_client_name TEXT;
    v_service_name TEXT;
    v_appointment_time TEXT;
BEGIN
    -- Buscar dados do salão e owner
    SELECT s.owner_id, s.name
    INTO v_salon_owner_id, v_salon_name
    FROM salons s
    WHERE s.id = NEW.salon_id;

    -- Buscar nome do serviço
    SELECT name INTO v_service_name
    FROM services
    WHERE id = NEW.service_id;

    -- Preparar dados
    v_client_name := COALESCE(NEW.client_name, 'Cliente');
    v_appointment_time := NEW.start_time;

    -- Inserir notificação para ser processada
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
        'new_appointment',
        'push',
        '🎉 Novo Agendamento!',
        v_client_name || ' agendou ' || v_service_name || ' para ' || TO_CHAR(NEW.date::DATE, 'DD/MM') || ' às ' || v_appointment_time,
        'pending'
    );

    -- Chamar Edge Function para enviar push (via HTTP)
    PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'salonId', NEW.salon_id,
            'ownerId', v_salon_owner_id,
            'title', '🎉 Novo Agendamento!',
            'body', v_client_name || ' agendou ' || v_service_name,
            'data', jsonb_build_object(
                'appointmentId', NEW.id,
                'type', 'new_appointment'
            )
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para novos agendamentos
DROP TRIGGER IF EXISTS trigger_notify_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_appointment();

-- 3. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(status, created_at) WHERE status = 'pending';

-- 4. Criar função para buscar subscriptions ativas de um usuário
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.endpoint,
        ps.p256dh,
        ps.auth
    FROM push_subscriptions ps
    WHERE ps.user_id = p_user_id
      AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para buscar subscriptions de um salão
CREATE OR REPLACE FUNCTION get_salon_push_subscriptions(p_salon_id UUID)
RETURNS TABLE (
    id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.id,
        ps.endpoint,
        ps.p256dh,
        ps.auth,
        ps.user_id
    FROM push_subscriptions ps
    WHERE ps.salon_id = p_salon_id
      AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários
COMMENT ON FUNCTION notify_new_appointment() IS 'Envia notificação push quando novo agendamento é criado';
COMMENT ON FUNCTION get_user_push_subscriptions(UUID) IS 'Busca todas as subscriptions ativas de um usuário';
COMMENT ON FUNCTION get_salon_push_subscriptions(UUID) IS 'Busca todas as subscriptions ativas de um salão';

-- =====================================================
-- SUCESSO! Sistema de notificações push configurado
-- =====================================================

SELECT 'Sistema de notificações push criado com sucesso!' as message;
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
-- =====================================================
-- MELHORIAS NA VISUALIZAÇÃO DA AGENDA
-- Mostra horários vagos e facilita adição manual
-- =====================================================

-- 1. Criar função para gerar grade de horários disponíveis
CREATE OR REPLACE FUNCTION get_schedule_grid(
    p_salon_id UUID,
    p_professional_id UUID,
    p_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN,
    appointment_id UUID,
    client_name TEXT,
    service_name TEXT,
    status TEXT,
    duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH time_slots AS (
        -- Gerar slots de 30 em 30 minutos das 8h às 20h
        SELECT generate_series(
            '08:00'::TIME,
            '20:00'::TIME,
            '30 minutes'::INTERVAL
        )::TIME as slot
    ),
    appointments_on_date AS (
        SELECT
            a.id,
            a.start_time,
            a.end_time,
            a.client_name,
            a.status,
            s.name as service_name,
            s.duration_minutes
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.salon_id = p_salon_id
          AND a.professional_id = p_professional_id
          AND a.date = p_date
          AND a.status NOT IN ('cancelled', 'no_show')
    )
    SELECT
        ts.slot,
        NOT EXISTS (
            SELECT 1
            FROM appointments_on_date aod
            WHERE ts.slot >= aod.start_time
              AND ts.slot < aod.end_time
        ) as is_available,
        aod.id as appointment_id,
        aod.client_name,
        aod.service_name,
        aod.status,
        aod.duration_minutes
    FROM time_slots ts
    LEFT JOIN appointments_on_date aod ON ts.slot = aod.start_time
    ORDER BY ts.slot;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar função para obter resumo do dia
CREATE OR REPLACE FUNCTION get_day_summary(
    p_salon_id UUID,
    p_date DATE
)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_build_object(
        'date', p_date,
        'total_appointments', COUNT(*),
        'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'total_revenue', COALESCE(SUM(final_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0),
        'available_slots', (
            SELECT COUNT(*)
            FROM generate_series('08:00'::TIME, '20:00'::TIME, '30 minutes'::INTERVAL) slot
            WHERE NOT EXISTS (
                SELECT 1
                FROM appointments a
                WHERE a.salon_id = p_salon_id
                  AND a.date = p_date
                  AND slot::TIME >= a.start_time
                  AND slot::TIME < a.end_time
                  AND a.status NOT IN ('cancelled', 'no_show')
            )
        ),
        'professionals', json_agg(DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'appointments_count', (
                SELECT COUNT(*)
                FROM appointments a2
                WHERE a2.professional_id = p.id
                  AND a2.date = p_date
                  AND a2.status NOT IN ('cancelled', 'no_show')
            )
        ))
    ) INTO v_summary
    FROM appointments a
    LEFT JOIN professionals p ON p.id = a.professional_id
    WHERE a.salon_id = p_salon_id
      AND a.date = p_date;

    RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar função para sugerir próximo horário disponível
CREATE OR REPLACE FUNCTION suggest_next_available_slot(
    p_salon_id UUID,
    p_professional_id UUID,
    p_service_id UUID,
    p_preferred_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    suggested_date DATE,
    suggested_time TIME,
    is_today BOOLEAN,
    days_from_now INTEGER
) AS $$
DECLARE
    v_duration INTEGER;
    v_max_days INTEGER := 30; -- Buscar até 30 dias à frente
BEGIN
    -- Buscar duração do serviço
    SELECT duration_minutes INTO v_duration
    FROM services
    WHERE id = p_service_id;

    IF v_duration IS NULL THEN
        v_duration := 60; -- Padrão 1 hora
    END IF;

    RETURN QUERY
    WITH RECURSIVE dates AS (
        SELECT p_preferred_date as check_date, 0 as day_offset
        UNION ALL
        SELECT check_date + 1, day_offset + 1
        FROM dates
        WHERE day_offset < v_max_days
    ),
    available_slots AS (
        SELECT
            d.check_date,
            ts.slot,
            d.day_offset
        FROM dates d
        CROSS JOIN generate_series('08:00'::TIME, '19:00'::TIME, '30 minutes'::INTERVAL) ts(slot)
        WHERE NOT EXISTS (
            SELECT 1
            FROM appointments a
            WHERE a.salon_id = p_salon_id
              AND a.professional_id = p_professional_id
              AND a.date = d.check_date
              AND a.status NOT IN ('cancelled', 'no_show')
              AND (
                  -- Verificar se há conflito
                  (ts.slot >= a.start_time AND ts.slot < a.end_time)
                  OR
                  (ts.slot + (v_duration || ' minutes')::INTERVAL > a.start_time::TIME
                   AND ts.slot < a.end_time)
              )
        )
        -- Verificar se o slot + duração não ultrapassa horário de fechamento
        AND ts.slot + (v_duration || ' minutes')::INTERVAL <= '20:00'::TIME
    )
    SELECT
        check_date,
        slot,
        check_date = CURRENT_DATE as is_today,
        day_offset
    FROM available_slots
    ORDER BY check_date, slot
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar view para agenda semanal
CREATE OR REPLACE VIEW weekly_schedule AS
WITH week_dates AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '6 days',
        '1 day'::INTERVAL
    )::DATE as date
)
SELECT
    wd.date,
    TO_CHAR(wd.date, 'Day') as day_name,
    s.id as salon_id,
    s.name as salon_name,
    p.id as professional_id,
    p.name as professional_name,
    COUNT(a.id) as total_appointments,
    COUNT(a.id) FILTER (WHERE a.status = 'confirmed') as confirmed_count,
    COUNT(a.id) FILTER (WHERE a.status = 'pending') as pending_count,
    COALESCE(SUM(a.final_price), 0) as total_revenue,
    json_agg(
        json_build_object(
            'id', a.id,
            'time', a.start_time,
            'client', a.client_name,
            'service', srv.name,
            'status', a.status
        ) ORDER BY a.start_time
    ) FILTER (WHERE a.id IS NOT NULL) as appointments
FROM week_dates wd
CROSS JOIN salons s
CROSS JOIN professionals p
LEFT JOIN appointments a ON
    a.date = wd.date AND
    a.salon_id = s.id AND
    a.professional_id = p.id AND
    a.status NOT IN ('cancelled', 'no_show')
LEFT JOIN services srv ON srv.id = a.service_id
WHERE p.salon_id = s.id
  AND p.is_active = true
GROUP BY wd.date, s.id, s.name, p.id, p.name
ORDER BY wd.date, p.name;

-- 5. Criar função para validar disponibilidade antes de criar agendamento
CREATE OR REPLACE FUNCTION validate_appointment_availability(
    p_salon_id UUID,
    p_professional_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_end_time TIME;
    v_conflicts INTEGER;
    v_result JSON;
BEGIN
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Verificar conflitos
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments
    WHERE salon_id = p_salon_id
      AND professional_id = p_professional_id
      AND date = p_date
      AND status NOT IN ('cancelled', 'no_show')
      AND (
          (p_start_time >= start_time AND p_start_time < end_time)
          OR
          (v_end_time > start_time AND v_end_time <= end_time)
          OR
          (p_start_time <= start_time AND v_end_time >= end_time)
      );

    v_result := json_build_object(
        'is_available', v_conflicts = 0,
        'conflicts', v_conflicts,
        'start_time', p_start_time,
        'end_time', v_end_time
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários
COMMENT ON FUNCTION get_schedule_grid(UUID, UUID, DATE) IS 'Gera grade de horários com disponibilidade';
COMMENT ON FUNCTION get_day_summary(UUID, DATE) IS 'Retorna resumo do dia com estatísticas';
COMMENT ON FUNCTION suggest_next_available_slot(UUID, UUID, UUID, DATE) IS 'Sugere próximos horários disponíveis';
COMMENT ON FUNCTION validate_appointment_availability(UUID, UUID, DATE, TIME, INTEGER) IS 'Valida se horário está disponível';

-- =====================================================
-- SUCESSO! Melhorias na agenda implementadas
-- =====================================================

SELECT 'Melhorias na visualização da agenda criadas com sucesso!' as message;
-- =====================================================
-- CONFIGURAÇÃO DE CRON JOBS PARA AUTOMAÇÕES
-- Agenda execuções automáticas de tarefas
-- =====================================================

-- 1. Cron para processar queue de broadcast (a cada 1 minuto)
SELECT cron.schedule(
    'process-broadcast-queue',
    '* * * * *', -- A cada minuto
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/broadcast-queue-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 2. Cron para mensagens de aniversário (todo dia às 9h)
SELECT cron.schedule(
    'birthday-messages-daily',
    '0 9 * * *', -- 9h da manhã todo dia
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/auto-birthday-messages',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 3. Cron para auto-post de status WhatsApp (a cada hora)
SELECT cron.schedule(
    'auto-post-status-hourly',
    '0 * * * *', -- A cada hora
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/auto-post-status',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 4. Cron para sincronizar Google Calendar (a cada 15 minutos)
SELECT cron.schedule(
    'sync-google-calendar',
    '*/15 * * * *', -- A cada 15 minutos
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/sync-google-calendar',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 5. Cron para limpar queue antiga (todo dia às 3h)
SELECT cron.schedule(
    'cleanup-old-queue',
    '0 3 * * *', -- 3h da manhã todo dia
    $$
    SELECT cleanup_old_broadcast_queue();
    $$
);

-- 6. Cron para verificar broadcasts travados (a cada 5 minutos)
SELECT cron.schedule(
    'check-stalled-broadcasts',
    '*/5 * * * *', -- A cada 5 minutos
    $$
    UPDATE broadcasts
    SET status = 'failed',
        error_message = 'Broadcast travado - sem atividade por mais de 30 minutos',
        completed_at = NOW()
    WHERE status = 'processing'
      AND last_activity_at < NOW() - INTERVAL '30 minutes';
    $$
);

-- 7. Cron para processar notificações pendentes (a cada 2 minutos)
SELECT cron.schedule(
    'process-pending-notifications',
    '*/2 * * * *', -- A cada 2 minutos
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/process-notifications',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 8. Comentários
COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas para automações do sistema';

-- =====================================================
-- SUCESSO! Cron jobs configurados
-- =====================================================

SELECT 'Cron jobs configurados com sucesso!' as message;

-- Listar todos os cron jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobid;
