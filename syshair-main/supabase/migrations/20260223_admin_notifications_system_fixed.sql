-- ============================================
-- SISTEMA DE NOTIFICAÇÕES PARA ADMINISTRADOR - CORRIGIDO
-- Notificações push quando cliente agendar, cancelar ou reagendar
-- ============================================

-- 1. Tabela de notificações para o admin (dono do salão)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_appointment', 'cancelled_appointment', 'rescheduled_appointment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  appointment_date DATE,
  appointment_time TIME,
  read BOOLEAN DEFAULT false,
  metadata JSONB, -- Dados extras (serviço, horário antigo, etc)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_salon ON public.admin_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(salon_id, read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);

-- RLS para notificações do admin
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Dono do salão pode ver suas notificações
CREATE POLICY "Salon owners can view their notifications" ON public.admin_notifications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = admin_notifications.salon_id AND salons.owner_id = auth.uid()
  ));

-- Dono do salão pode atualizar (marcar como lida)
CREATE POLICY "Salon owners can update their notifications" ON public.admin_notifications
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = admin_notifications.salon_id AND salons.owner_id = auth.uid()
  ));

-- Dono do salão pode deletar suas notificações
CREATE POLICY "Salon owners can delete their notifications" ON public.admin_notifications
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = admin_notifications.salon_id AND salons.owner_id = auth.uid()
  ));

-- ============================================
-- 2. FUNÇÃO: Criar notificação para novo agendamento
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  service_name TEXT;
BEGIN
  -- Buscar nome do serviço
  SELECT name INTO service_name
  FROM services
  WHERE id = NEW.service_id;

  -- Criar notificação
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
  )
  VALUES (
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
      'service_id', NEW.service_id,
      'professional_id', NEW.professional_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO: Criar notificação para cancelamento
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_cancelled_appointment()
RETURNS TRIGGER AS $$
DECLARE
  service_name TEXT;
BEGIN
  -- Só notificar se mudou de outro status para 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN

    -- Buscar nome do serviço
    SELECT name INTO service_name
    FROM services
    WHERE id = NEW.service_id;

    -- Criar notificação
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
    )
    VALUES (
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
        'service_id', NEW.service_id,
        'professional_id', NEW.professional_id,
        'old_status', OLD.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO: Criar notificação para reagendamento
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_rescheduled_appointment()
RETURNS TRIGGER AS $$
DECLARE
  service_name TEXT;
BEGIN
  -- Só notificar se a data OU horário mudou
  IF (NEW.date != OLD.date) OR (NEW.start_time != OLD.start_time) THEN

    -- Buscar nome do serviço
    SELECT name INTO service_name
    FROM services
    WHERE id = NEW.service_id;

    -- Criar notificação
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
    )
    VALUES (
      NEW.salon_id,
      NEW.id,
      'rescheduled_appointment',
      '🔄 Agendamento Reagendado',
      NEW.client_name || ' reagendou ' || COALESCE(service_name, 'o serviço') || ' de ' ||
      to_char(OLD.date, 'DD/MM/YYYY') || ' ' || to_char(OLD.start_time, 'HH24:MI') || ' para ' ||
      to_char(NEW.date, 'DD/MM/YYYY') || ' ' || to_char(NEW.start_time, 'HH24:MI'),
      NEW.client_name,
      NEW.client_phone,
      NEW.date,
      NEW.start_time,
      jsonb_build_object(
        'service_name', service_name,
        'service_id', NEW.service_id,
        'professional_id', NEW.professional_id,
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

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger para NOVO agendamento
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_appointment();

-- Trigger para CANCELAMENTO
DROP TRIGGER IF EXISTS on_appointment_cancelled ON public.appointments;
CREATE TRIGGER on_appointment_cancelled
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION notify_admin_cancelled_appointment();

-- Trigger para REAGENDAMENTO
DROP TRIGGER IF EXISTS on_appointment_rescheduled ON public.appointments;
CREATE TRIGGER on_appointment_rescheduled
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  WHEN ((NEW.date IS DISTINCT FROM OLD.date) OR (NEW.start_time IS DISTINCT FROM OLD.start_time))
  EXECUTE FUNCTION notify_admin_rescheduled_appointment();

-- ============================================
-- 6. FUNÇÃO HELPER: Marcar todas como lidas
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_salon_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET read = true
  WHERE salon_id = p_salon_id AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNÇÃO HELPER: Contar não lidas
-- ============================================
CREATE OR REPLACE FUNCTION count_unread_notifications(p_salon_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.admin_notifications
  WHERE salon_id = p_salon_id AND read = false;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.admin_notifications IS 'Notificações para o administrador do salão sobre agendamentos';
COMMENT ON FUNCTION notify_admin_new_appointment() IS 'Cria notificação quando cliente faz novo agendamento';
COMMENT ON FUNCTION notify_admin_cancelled_appointment() IS 'Cria notificação quando cliente cancela agendamento';
COMMENT ON FUNCTION notify_admin_rescheduled_appointment() IS 'Cria notificação quando cliente reagenda';
COMMENT ON FUNCTION mark_all_notifications_as_read(UUID) IS 'Marca todas as notificações de um salão como lidas';
COMMENT ON FUNCTION count_unread_notifications(UUID) IS 'Conta notificações não lidas de um salão';
