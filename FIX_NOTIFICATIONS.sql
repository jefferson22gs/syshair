-- ============================================
-- CORREÇÃO RÁPIDA - Notificações e WhatsApp
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'admin_notifications'
) as tabela_existe;

-- 2. Se a tabela não existir, criar agora
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('new_appointment', 'cancelled_appointment', 'rescheduled_appointment')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    client_name TEXT,
    client_phone TEXT,
    appointment_date DATE,
    appointment_time TIME,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_admin_notifications_salon_id ON admin_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Salon owners can view their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can update their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can delete their notifications" ON admin_notifications;

-- 6. Criar políticas RLS corretas
CREATE POLICY "Salon owners can view their notifications"
ON admin_notifications
FOR SELECT
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "System can insert notifications"
ON admin_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Salon owners can update their notifications"
ON admin_notifications
FOR UPDATE
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Salon owners can delete their notifications"
ON admin_notifications
FOR DELETE
USING (
    salon_id IN (
        SELECT id FROM salons WHERE owner_id = auth.uid()
    )
);

-- 7. Criar função de trigger para novos agendamentos
CREATE OR REPLACE FUNCTION notify_admin_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    service_name TEXT;
    professional_name TEXT;
BEGIN
    -- Buscar nome do serviço
    SELECT name INTO service_name FROM services WHERE id = NEW.service_id;

    -- Buscar nome do profissional
    SELECT name INTO professional_name FROM professionals WHERE id = NEW.professional_id;

    -- Inserir notificação
    INSERT INTO public.admin_notifications (
        salon_id,
        appointment_id,
        type,
        title,
        message,
        client_name,
        client_phone,
        appointment_date,
        appointment_time,
        metadata
    ) VALUES (
        NEW.salon_id,
        NEW.id,
        'new_appointment',
        '🎉 Novo Agendamento',
        NEW.client_name || ' agendou ' || COALESCE(service_name, 'um serviço') || ' para ' ||
        to_char(NEW.date, 'DD/MM/YYYY') || ' às ' || to_char(NEW.start_time, 'HH24:MI'),
        NEW.client_name,
        NEW.client_phone,
        NEW.date,
        NEW.start_time,
        jsonb_build_object(
            'service_name', service_name,
            'professional_name', professional_name,
            'service_id', NEW.service_id,
            'professional_id', NEW.professional_id,
            'status', NEW.status
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar função de trigger para cancelamentos
CREATE OR REPLACE FUNCTION notify_admin_cancelled_appointment()
RETURNS TRIGGER AS $$
DECLARE
    service_name TEXT;
BEGIN
    -- Apenas notificar se o status mudou para cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        SELECT name INTO service_name FROM services WHERE id = NEW.service_id;

        INSERT INTO public.admin_notifications (
            salon_id,
            appointment_id,
            type,
            title,
            message,
            client_name,
            client_phone,
            appointment_date,
            appointment_time,
            metadata
        ) VALUES (
            NEW.salon_id,
            NEW.id,
            'cancelled_appointment',
            '❌ Agendamento Cancelado',
            NEW.client_name || ' cancelou ' || COALESCE(service_name, 'o agendamento') || ' de ' ||
            to_char(NEW.date, 'DD/MM/YYYY') || ' às ' || to_char(NEW.start_time, 'HH24:MI'),
            NEW.client_name,
            NEW.client_phone,
            NEW.date,
            NEW.start_time,
            jsonb_build_object(
                'service_name', service_name,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Criar função de trigger para reagendamentos
CREATE OR REPLACE FUNCTION notify_admin_rescheduled_appointment()
RETURNS TRIGGER AS $$
DECLARE
    service_name TEXT;
BEGIN
    -- Apenas notificar se data ou horário mudou
    IF (OLD.date != NEW.date OR OLD.start_time != NEW.start_time) THEN
        SELECT name INTO service_name FROM services WHERE id = NEW.service_id;

        INSERT INTO public.admin_notifications (
            salon_id,
            appointment_id,
            type,
            title,
            message,
            client_name,
            client_phone,
            appointment_date,
            appointment_time,
            metadata
        ) VALUES (
            NEW.salon_id,
            NEW.id,
            'rescheduled_appointment',
            '🔄 Agendamento Reagendado',
            NEW.client_name || ' reagendou ' || COALESCE(service_name, 'o agendamento') || ' de ' ||
            to_char(OLD.date, 'DD/MM/YYYY') || ' às ' || to_char(OLD.start_time, 'HH24:MI') ||
            ' para ' || to_char(NEW.date, 'DD/MM/YYYY') || ' às ' || to_char(NEW.start_time, 'HH24:MI'),
            NEW.client_name,
            NEW.client_phone,
            NEW.date,
            NEW.start_time,
            jsonb_build_object(
                'service_name', service_name,
                'old_date', OLD.date,
                'old_time', OLD.start_time,
                'new_date', NEW.date,
                'new_time', NEW.start_time
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Remover triggers antigos
DROP TRIGGER IF EXISTS trigger_notify_admin_new_appointment ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_cancelled ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_rescheduled ON appointments;

-- 11. Criar triggers
CREATE TRIGGER trigger_notify_admin_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_new_appointment();

CREATE TRIGGER trigger_notify_admin_cancelled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_cancelled_appointment();

CREATE TRIGGER trigger_notify_admin_rescheduled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_rescheduled_appointment();

-- 12. Testar criando uma notificação manual
INSERT INTO admin_notifications (
    salon_id,
    type,
    title,
    message,
    client_name,
    client_phone,
    appointment_date,
    appointment_time
)
SELECT
    s.id,
    'new_appointment',
    '🧪 Teste de Notificação',
    'Esta é uma notificação de teste criada manualmente',
    'Cliente Teste',
    '11999999999',
    CURRENT_DATE,
    CURRENT_TIME
FROM salons s
WHERE s.is_active = true
LIMIT 1;

-- 13. Verificar se a notificação foi criada
SELECT
    id,
    type,
    title,
    message,
    client_name,
    read,
    created_at
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 5;

-- 14. Verificar triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- ============================================
-- RESULTADO ESPERADO:
-- - Tabela admin_notifications criada
-- - 4 políticas RLS ativas
-- - 3 triggers criados
-- - 1 notificação de teste criada
-- ============================================
