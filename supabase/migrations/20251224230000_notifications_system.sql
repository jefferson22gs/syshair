-- ============================================
-- BACKEND SUPABASE - SISTEMA DE NOTIFICAÇÕES
-- ============================================

-- 1. Adicionar coluna loyalty_points (se não existir)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- 2. Tabela para armazenar notificações enviadas
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'review_request', 'marketing', 'reminder', 'birthday'
  channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'push', 'email'
  title TEXT,
  message TEXT NOT NULL,
  phone VARCHAR(20), -- Telefone do destinatário
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'scheduled'
  scheduled_for TIMESTAMPTZ, -- Quando deve ser enviada
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_notifications_salon ON public.notifications(salon_id);

-- RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage notifications" ON public.notifications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM salons WHERE salons.id = notifications.salon_id AND salons.owner_id = auth.uid()
  ));

-- 3. Função para agendar notificação de review 1h após serviço concluído
CREATE OR REPLACE FUNCTION schedule_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'completed', agendar notificação para daqui 1 hora
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.notifications (
      salon_id,
      appointment_id,
      type,
      channel,
      title,
      message,
      phone,
      status,
      scheduled_for
    )
    VALUES (
      NEW.salon_id,
      NEW.id,
      'review_request',
      'whatsapp',
      'Avalie seu atendimento',
      'Olá ' || COALESCE(split_part(NEW.client_name, ' ', 1), 'Cliente') || '! 🌟 Como foi sua experiência conosco? Adoraríamos saber sua opinião!',
      NEW.client_phone,
      'scheduled',
      NOW() + INTERVAL '1 hour'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se existir (para poder recriar)
DROP TRIGGER IF EXISTS on_appointment_completed ON public.appointments;

-- Criar trigger
CREATE TRIGGER on_appointment_completed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_review_notification();

-- 4. Função para agendar lembrete de aniversário
CREATE OR REPLACE FUNCTION check_birthday_notifications()
RETURNS void AS $$
DECLARE
  client_record RECORD;
  birthday_date TEXT;
  client_birthday DATE;
BEGIN
  -- Buscar clientes que fazem aniversário hoje
  FOR client_record IN 
    SELECT c.*, s.name as salon_name, s.id as salon_id
    FROM clients c
    JOIN salons s ON s.id = c.salon_id
    WHERE c.notes LIKE '%Aniversário:%'
  LOOP
    -- Extrair data de nascimento do campo notes
    birthday_date := substring(client_record.notes from 'Aniversário: ([0-9]{2}/[0-9]{2}/[0-9]{4})');
    
    IF birthday_date IS NOT NULL THEN
      -- Verificar se é hoje (comparar dia/mês)
      IF to_char(CURRENT_DATE, 'DD/MM') = substring(birthday_date, 1, 5) THEN
        -- Verificar se já não enviamos hoje
        IF NOT EXISTS (
          SELECT 1 FROM notifications 
          WHERE client_id = client_record.id 
          AND type = 'birthday'
          AND DATE(created_at) = CURRENT_DATE
        ) THEN
          INSERT INTO public.notifications (
            salon_id,
            client_id,
            type,
            channel,
            title,
            message,
            phone,
            status
          )
          VALUES (
            client_record.salon_id,
            client_record.id,
            'birthday',
            'whatsapp',
            'Feliz Aniversário!',
            'Feliz Aniversário, ' || split_part(client_record.name, ' ', 1) || '! 🎂🎉 O ' || client_record.salon_name || ' deseja um dia incrível! Temos um presente especial esperando por você!',
            client_record.phone,
            'pending'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE public.notifications IS 'Tabela para gerenciar notificações enviadas aos clientes';
COMMENT ON FUNCTION schedule_review_notification() IS 'Trigger que agenda notificação de avaliação 1h após serviço concluído';
COMMENT ON FUNCTION check_birthday_notifications() IS 'Função para verificar e criar notificações de aniversário';
