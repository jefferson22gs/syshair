-- ============================================
-- CORREÇÃO: WhatsApp Automático + Notificações Push Cliente
-- Data: 23/02/2026 às 14:36
-- ============================================

-- ============================================
-- PARTE 1: Criar tabela de configurações WhatsApp
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_url TEXT NOT NULL DEFAULT 'https://api.tubaraoemprestimo.com.br',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id)
);

-- Inserir configuração padrão
INSERT INTO whatsapp_config (salon_id, instance_name, api_key, api_url, is_active)
SELECT
    id,
    'syshair_daniel_cabelos_1777c2a7',
    'B8959800-F546-407C-99E8-C40306E747F5',
    'https://api.tubaraoemprestimo.com.br',
    true
FROM salons
WHERE is_active = true
ON CONFLICT (salon_id) DO UPDATE
SET
    instance_name = EXCLUDED.instance_name,
    api_key = EXCLUDED.api_key,
    api_url = EXCLUDED.api_url,
    updated_at = NOW();

-- ============================================
-- PARTE 2: Criar tabela de notificações para clientes
-- ============================================

CREATE TABLE IF NOT EXISTS client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('appointment_confirmed', 'appointment_reminder', 'appointment_cancelled', 'appointment_rescheduled')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMPTZ,
    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_notifications_salon ON client_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_phone ON client_notifications(client_phone);
CREATE INDEX IF NOT EXISTS idx_client_notifications_appointment ON client_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_whatsapp ON client_notifications(salon_id, whatsapp_sent);

-- RLS
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Salon owners can view client notifications" ON client_notifications;
CREATE POLICY "Salon owners can view client notifications"
ON client_notifications FOR SELECT
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "System can insert client notifications" ON client_notifications;
CREATE POLICY "System can insert client notifications"
ON client_notifications FOR INSERT
WITH CHECK (true);

-- ============================================
-- PARTE 3: Função para enviar WhatsApp via HTTP
-- ============================================

CREATE OR REPLACE FUNCTION send_whatsapp_notification(
    p_salon_id UUID,
    p_phone TEXT,
    p_message TEXT
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_phone_formatted TEXT;
    v_url TEXT;
    v_response JSONB;
BEGIN
    -- Buscar configuração do WhatsApp
    SELECT * INTO v_config
    FROM whatsapp_config
    WHERE salon_id = p_salon_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'WhatsApp config not found for salon %', p_salon_id;
        RETURN jsonb_build_object('success', false, 'error', 'Config not found');
    END IF;

    -- Formatar telefone (remover caracteres não numéricos)
    v_phone_formatted := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Adicionar código do país se não tiver
    IF length(v_phone_formatted) = 11 THEN
        v_phone_formatted := '55' || v_phone_formatted;
    END IF;

    -- Construir URL
    v_url := v_config.api_url || '/message/sendText/' || v_config.instance_name;

    -- Fazer requisição HTTP usando pg_net (se disponível) ou http extension
    -- Por enquanto, vamos apenas registrar que precisa ser enviado
    -- A aplicação frontend ou um worker vai processar isso

    RAISE NOTICE 'WhatsApp to send: % - %', v_phone_formatted, p_message;

    RETURN jsonb_build_object(
        'success', true,
        'phone', v_phone_formatted,
        'url', v_url,
        'api_key', v_config.api_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 4: Trigger para enviar WhatsApp quando agendamento é criado
-- ============================================

CREATE OR REPLACE FUNCTION notify_client_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_salon_name TEXT;
    v_message TEXT;
    v_manage_link TEXT;
BEGIN
    -- Buscar informações
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM professionals WHERE id = NEW.professional_id;
    SELECT name INTO v_salon_name FROM salons WHERE id = NEW.salon_id;

    -- Gerar link de gerenciamento
    v_manage_link := 'https://syshair.com/manage-appointment?id=' || NEW.id || '&phone=' || NEW.client_phone;

    -- Montar mensagem
    v_message := '🎉 *Agendamento Confirmado!*

📍 *Salão:* ' || v_salon_name || '
✂️ *Serviço:* ' || COALESCE(v_service_name, 'Serviço') || '
👤 *Profissional:* ' || COALESCE(v_professional_name, 'Qualquer disponível') || '
📅 *Data:* ' || to_char(NEW.date, 'DD/MM/YYYY') || '
⏰ *Horário:* ' || to_char(NEW.start_time, 'HH24:MI') || '

🔗 *Gerenciar agendamento:*
' || v_manage_link || '

_Você pode cancelar ou reagendar até 2 horas antes do horário._';

    -- Inserir notificação para cliente
    INSERT INTO client_notifications (
        salon_id,
        appointment_id,
        client_phone,
        client_name,
        type,
        title,
        message,
        metadata
    ) VALUES (
        NEW.salon_id,
        NEW.id,
        NEW.client_phone,
        NEW.client_name,
        'appointment_confirmed',
        'Agendamento Confirmado',
        v_message,
        jsonb_build_object(
            'service_name', v_service_name,
            'professional_name', v_professional_name,
            'salon_name', v_salon_name,
            'date', NEW.date,
            'time', NEW.start_time,
            'manage_link', v_manage_link
        )
    );

    -- Tentar enviar WhatsApp (registra para processamento)
    PERFORM send_whatsapp_notification(
        NEW.salon_id,
        NEW.client_phone,
        v_message
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_notify_client_new_appointment ON appointments;

-- Criar trigger
CREATE TRIGGER trigger_notify_client_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_new_appointment();

-- ============================================
-- PARTE 5: Trigger para notificar cancelamento
-- ============================================

CREATE OR REPLACE FUNCTION notify_client_cancelled_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_salon_name TEXT;
    v_message TEXT;
BEGIN
    -- Apenas notificar se o status mudou para cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
        SELECT name INTO v_salon_name FROM salons WHERE id = NEW.salon_id;

        v_message := '❌ *Agendamento Cancelado*

📍 *Salão:* ' || v_salon_name || '
✂️ *Serviço:* ' || COALESCE(v_service_name, 'Serviço') || '
📅 *Data:* ' || to_char(NEW.date, 'DD/MM/YYYY') || '
⏰ *Horário:* ' || to_char(NEW.start_time, 'HH24:MI') || '

Seu agendamento foi cancelado. Para reagendar, entre em contato conosco.';

        -- Inserir notificação
        INSERT INTO client_notifications (
            salon_id,
            appointment_id,
            client_phone,
            client_name,
            type,
            title,
            message,
            metadata
        ) VALUES (
            NEW.salon_id,
            NEW.id,
            NEW.client_phone,
            NEW.client_name,
            'appointment_cancelled',
            'Agendamento Cancelado',
            v_message,
            jsonb_build_object(
                'service_name', v_service_name,
                'salon_name', v_salon_name,
                'date', NEW.date,
                'time', NEW.start_time
            )
        );

        -- Enviar WhatsApp
        PERFORM send_whatsapp_notification(
            NEW.salon_id,
            NEW.client_phone,
            v_message
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS trigger_notify_client_cancelled ON appointments;

-- Criar trigger
CREATE TRIGGER trigger_notify_client_cancelled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_cancelled_appointment();

-- ============================================
-- PARTE 6: Trigger para notificar reagendamento
-- ============================================

CREATE OR REPLACE FUNCTION notify_client_rescheduled_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_salon_name TEXT;
    v_message TEXT;
    v_manage_link TEXT;
BEGIN
    -- Apenas notificar se data ou horário mudou
    IF (OLD.date != NEW.date OR OLD.start_time != NEW.start_time) THEN
        SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
        SELECT name INTO v_salon_name FROM salons WHERE id = NEW.salon_id;

        v_manage_link := 'https://syshair.com/manage-appointment?id=' || NEW.id || '&phone=' || NEW.client_phone;

        v_message := '🔄 *Agendamento Reagendado*

📍 *Salão:* ' || v_salon_name || '
✂️ *Serviço:* ' || COALESCE(v_service_name, 'Serviço') || '

📅 *Nova Data:* ' || to_char(NEW.date, 'DD/MM/YYYY') || '
⏰ *Novo Horário:* ' || to_char(NEW.start_time, 'HH24:MI') || '

🔗 *Gerenciar agendamento:*
' || v_manage_link;

        -- Inserir notificação
        INSERT INTO client_notifications (
            salon_id,
            appointment_id,
            client_phone,
            client_name,
            type,
            title,
            message,
            metadata
        ) VALUES (
            NEW.salon_id,
            NEW.id,
            NEW.client_phone,
            NEW.client_name,
            'appointment_rescheduled',
            'Agendamento Reagendado',
            v_message,
            jsonb_build_object(
                'service_name', v_service_name,
                'salon_name', v_salon_name,
                'old_date', OLD.date,
                'old_time', OLD.start_time,
                'new_date', NEW.date,
                'new_time', NEW.start_time,
                'manage_link', v_manage_link
            )
        );

        -- Enviar WhatsApp
        PERFORM send_whatsapp_notification(
            NEW.salon_id,
            NEW.client_phone,
            v_message
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS trigger_notify_client_rescheduled ON appointments;

-- Criar trigger
CREATE TRIGGER trigger_notify_client_rescheduled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_client_rescheduled_appointment();

-- ============================================
-- PARTE 7: Habilitar Realtime
-- ============================================

-- Habilitar Realtime na tabela de notificações do cliente
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;

-- ============================================
-- PARTE 8: Verificação Final
-- ============================================

SELECT '=== VERIFICAÇÃO DO SISTEMA ===' as info;

SELECT
    '1. Tabela whatsapp_config' as check_item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_config')
    THEN '✅ SIM' ELSE '❌ NÃO' END as status
UNION ALL SELECT '2. Tabela client_notifications',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_notifications')
    THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL SELECT '3. Triggers criados',
    CASE WHEN (
        SELECT COUNT(*) FROM information_schema.triggers
        WHERE event_object_table = 'appointments'
        AND trigger_name LIKE '%notify_client%'
    ) >= 3 THEN '✅ SIM (3)' ELSE '❌ NÃO' END
UNION ALL SELECT '4. Configuração WhatsApp',
    CASE WHEN (SELECT COUNT(*) FROM whatsapp_config WHERE is_active = true) > 0
    THEN '✅ SIM' ELSE '❌ NÃO' END;

-- Ver configuração WhatsApp
SELECT '=== CONFIGURAÇÃO WHATSAPP ===' as info;
SELECT salon_id, instance_name, is_active FROM whatsapp_config;

-- Ver triggers
SELECT '=== TRIGGERS CRIADOS ===' as info;
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
AND trigger_name LIKE '%notify_client%';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ 1. Tabela whatsapp_config: SIM
-- ✅ 2. Tabela client_notifications: SIM
-- ✅ 3. Triggers criados: SIM (3)
-- ✅ 4. Configuração WhatsApp: SIM
--
-- PRÓXIMO PASSO:
-- 1. Criar um agendamento de teste
-- 2. Verificar se notificação foi criada em client_notifications
-- 3. Processar envio de WhatsApp (via Edge Function ou Worker)
-- ============================================
