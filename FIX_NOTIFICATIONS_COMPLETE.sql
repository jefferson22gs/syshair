-- ============================================
-- CORREÇÃO COMPLETA - Sistema de Notificações
-- Execute este SQL no Supabase SQL Editor
-- Data: 23/02/2026 às 13:09
-- ============================================

-- ============================================
-- PARTE 1: DIAGNÓSTICO
-- ============================================

-- 1.1 Verificar se a tabela existe
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admin_notifications'
    ) THEN
        RAISE NOTICE '✅ Tabela admin_notifications existe';
    ELSE
        RAISE NOTICE '❌ Tabela admin_notifications NÃO existe - será criada';
    END IF;
END $$;

-- 1.2 Verificar RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'admin_notifications'
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS está habilitado';
    ELSE
        RAISE NOTICE '⚠️ RLS não está habilitado - será habilitado';
    END IF;
END $$;

-- 1.3 Verificar políticas
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'admin_notifications';

    RAISE NOTICE 'Políticas encontradas: %', policy_count;

    IF policy_count >= 4 THEN
        RAISE NOTICE '✅ Políticas RLS configuradas';
    ELSE
        RAISE NOTICE '⚠️ Políticas incompletas - serão criadas';
    END IF;
END $$;

-- 1.4 Verificar triggers
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'appointments'
    AND trigger_name LIKE '%notify_admin%';

    RAISE NOTICE 'Triggers encontrados: %', trigger_count;

    IF trigger_count >= 3 THEN
        RAISE NOTICE '✅ Triggers configurados';
    ELSE
        RAISE NOTICE '⚠️ Triggers incompletos - serão criados';
    END IF;
END $$;

-- ============================================
-- PARTE 2: CRIAÇÃO/CORREÇÃO
-- ============================================

-- 2.1 Criar tabela (se não existir)
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

-- 2.2 Criar índices
CREATE INDEX IF NOT EXISTS idx_admin_notifications_salon ON admin_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(salon_id, read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- 2.3 Habilitar RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 2.4 Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Salon owners can view their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can update their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Salon owners can delete their notifications" ON admin_notifications;

-- 2.5 Criar políticas RLS
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

-- 2.6 Criar função de trigger para novos agendamentos
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

-- 2.7 Criar função de trigger para cancelamentos
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

-- 2.8 Criar função de trigger para reagendamentos
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

-- 2.9 Remover triggers antigos
DROP TRIGGER IF EXISTS trigger_notify_admin_new_appointment ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_cancelled ON appointments;
DROP TRIGGER IF EXISTS trigger_notify_admin_rescheduled ON appointments;

-- 2.10 Criar triggers
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

-- ============================================
-- PARTE 3: CRIAR NOTIFICAÇÃO DE TESTE
-- ============================================

-- 3.1 Inserir notificação de teste
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
    '🧪 Teste de Notificação - Sistema Funcionando!',
    'Esta é uma notificação de teste criada em ' || to_char(NOW(), 'DD/MM/YYYY às HH24:MI') || '. Se você está vendo isso no sino, o sistema está funcionando corretamente! 🎉',
    'Cliente Teste',
    '11999999999',
    CURRENT_DATE,
    CURRENT_TIME
FROM salons s
WHERE s.is_active = true
LIMIT 1;

-- ============================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- ============================================

-- 4.1 Status completo
SELECT
    '1. Tabela existe' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'admin_notifications'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END as status
UNION ALL
SELECT
    '2. RLS habilitado',
    CASE WHEN (
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'admin_notifications'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '3. Políticas criadas',
    CASE WHEN (
        SELECT COUNT(*)
        FROM pg_policies
        WHERE tablename = 'admin_notifications'
    ) >= 4 THEN '✅ SIM (' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'admin_notifications') || ' políticas)' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '4. Triggers criados',
    CASE WHEN (
        SELECT COUNT(*)
        FROM information_schema.triggers
        WHERE event_object_table = 'appointments'
          AND trigger_name LIKE '%notify_admin%'
    ) >= 3 THEN '✅ SIM (' || (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'appointments' AND trigger_name LIKE '%notify_admin%') || ' triggers)' ELSE '❌ NÃO' END
UNION ALL
SELECT
    '5. Notificações criadas',
    CASE WHEN (
        SELECT COUNT(*)
        FROM admin_notifications
    ) > 0 THEN '✅ SIM (' || (SELECT COUNT(*) FROM admin_notifications) || ' notificações)' ELSE '⚠️ VAZIO' END;

-- 4.2 Listar últimas notificações
SELECT
    '=== ÚLTIMAS NOTIFICAÇÕES ===' as info;

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

-- 4.3 Listar políticas
SELECT
    '=== POLÍTICAS RLS ===' as info;

SELECT
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'admin_notifications'
ORDER BY policyname;

-- 4.4 Listar triggers
SELECT
    '=== TRIGGERS ===' as info;

SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
  AND trigger_name LIKE '%notify_admin%'
ORDER BY trigger_name;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ 1. Tabela existe: SIM
-- ✅ 2. RLS habilitado: SIM
-- ✅ 3. Políticas criadas: SIM (4 políticas)
-- ✅ 4. Triggers criados: SIM (3 triggers)
-- ✅ 5. Notificações criadas: SIM (1+ notificações)
--
-- PRÓXIMO PASSO:
-- 1. Habilitar Realtime no Supabase Dashboard:
--    Database → Replication → admin_notifications [✓]
--
-- 2. Acessar: http://localhost:5173/admin
--    - Clicar no sino
--    - Deve aparecer a notificação de teste
-- ============================================
