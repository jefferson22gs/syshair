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
