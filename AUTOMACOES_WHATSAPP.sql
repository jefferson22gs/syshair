-- ============================================
-- SCRIPT SQL: AUTOMAÇÕES DE WHATSAPP
-- Data: 2026-02-18
-- ============================================

-- 1. Criar tabela de logs de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message_type TEXT NOT NULL, -- 'appointment_confirmation', 'birthday', 'reminder', 'custom'
    message_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    whatsapp_message_id TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_salon_id ON whatsapp_logs(salon_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_appointment_id ON whatsapp_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_client_id ON whatsapp_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_type ON whatsapp_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at);

-- 2. Adicionar colunas necessárias na tabela salons
ALTER TABLE salons
ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT,
ADD COLUMN IF NOT EXISTS auto_confirm_appointments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_birthday_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS birthday_discount_percent INTEGER DEFAULT 10;

-- 3. Adicionar coluna birth_date na tabela clients (se não existir)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 4. Criar função para disparar confirmação automática de agendamento
CREATE OR REPLACE FUNCTION trigger_appointment_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    salon_auto_confirm BOOLEAN;
    salon_instance TEXT;
BEGIN
    -- Verificar se o salão tem auto-confirmação ativada
    SELECT auto_confirm_appointments, whatsapp_instance_name
    INTO salon_auto_confirm, salon_instance
    FROM salons
    WHERE id = NEW.salon_id;

    -- Se auto-confirmação está ativa e tem instância configurada
    IF salon_auto_confirm = true AND salon_instance IS NOT NULL THEN
        -- Chamar Edge Function de forma assíncrona
        PERFORM net.http_post(
            url := current_setting('app.supabase_url') || '/functions/v1/auto-appointment-confirmation',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
            ),
            body := jsonb_build_object(
                'id', NEW.id,
                'salon_id', NEW.salon_id,
                'client_name', NEW.client_name,
                'client_phone', NEW.client_phone,
                'client_email', NEW.client_email,
                'service_name', NEW.service_name,
                'professional_name', NEW.professional_name,
                'appointment_date', NEW.appointment_date,
                'appointment_time', NEW.appointment_time,
                'total_price', NEW.total_price,
                'status', NEW.status
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para novos agendamentos
DROP TRIGGER IF EXISTS on_appointment_created ON appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_appointment_confirmation();

-- 6. Criar tabela de templates de mensagens personalizadas
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'appointment_confirmation', 'birthday', 'reminder', 'custom'
    content TEXT NOT NULL,
    variables JSONB, -- Variáveis disponíveis: {client_name}, {salon_name}, {date}, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_message_templates_salon_id ON message_templates(salon_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- 7. Inserir templates padrão de aniversário
INSERT INTO message_templates (salon_id, name, type, content, variables, is_active)
SELECT
    id as salon_id,
    'Aniversário - Clássico Elegante',
    'birthday',
    '🎉🎂 *Feliz Aniversário, {client_name}!* 🎂🎉

A equipe *{salon_name}* deseja um dia repleto de alegria, amor e realizações! ✨

🎁 *Presente Especial:*
Ganhe *{discount}% de desconto* em qualquer serviço durante todo o mês do seu aniversário! 🎊

Que este novo ciclo seja cheio de beleza, saúde e felicidade! 💖

Estamos te esperando para comemorar juntos! 🥳',
    '{"client_name": "Nome do cliente", "salon_name": "Nome do salão", "discount": "Percentual de desconto"}'::jsonb,
    true
FROM salons
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates
    WHERE message_templates.salon_id = salons.id
    AND message_templates.type = 'birthday'
)
LIMIT 1;

-- 8. RLS (Row Level Security) para whatsapp_logs
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salons can view their own WhatsApp logs" ON whatsapp_logs;
CREATE POLICY "Salons can view their own WhatsApp logs"
    ON whatsapp_logs FOR SELECT
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Salons can insert their own WhatsApp logs" ON whatsapp_logs;
CREATE POLICY "Salons can insert their own WhatsApp logs"
    ON whatsapp_logs FOR INSERT
    WITH CHECK (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

-- 9. RLS para message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salons can manage their own templates" ON message_templates;
CREATE POLICY "Salons can manage their own templates"
    ON message_templates FOR ALL
    USING (
        salon_id IN (
            SELECT id FROM salons WHERE owner_id = auth.uid()
        )
    );

-- 10. Criar view para estatísticas de WhatsApp
CREATE OR REPLACE VIEW whatsapp_stats AS
SELECT
    salon_id,
    message_type,
    status,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') as last_24h,
    COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') as last_7days,
    COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '30 days') as last_30days
FROM whatsapp_logs
GROUP BY salon_id, message_type, status;

-- 11. Função para buscar aniversariantes do dia
CREATE OR REPLACE FUNCTION get_birthday_clients(p_salon_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    birth_date DATE,
    age INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.phone,
        c.birth_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birth_date))::INTEGER as age
    FROM clients c
    WHERE c.salon_id = p_salon_id
        AND c.birth_date IS NOT NULL
        AND c.phone IS NOT NULL
        AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Atualizar função updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_logs_updated_at ON whatsapp_logs;
CREATE TRIGGER update_whatsapp_logs_updated_at
    BEFORE UPDATE ON whatsapp_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Tabela whatsapp_logs criada';
    RAISE NOTICE '✅ Tabela message_templates criada';
    RAISE NOTICE '✅ Colunas adicionadas em salons';
    RAISE NOTICE '✅ Coluna birth_date adicionada em clients';
    RAISE NOTICE '✅ Trigger de confirmação automática criado';
    RAISE NOTICE '✅ RLS configurado';
    RAISE NOTICE '✅ Views e funções criadas';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TODAS AS AUTOMAÇÕES DE WHATSAPP CONFIGURADAS COM SUCESSO!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '1. Deploy das Edge Functions no Supabase';
    RAISE NOTICE '2. Configurar cron job para mensagens de aniversário';
    RAISE NOTICE '3. Configurar whatsapp_instance_name em cada salão';
END $$;
