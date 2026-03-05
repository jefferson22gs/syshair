# 🎯 EXECUTE AGORA - 3 Comandos SQL

**Data:** 23/02/2026 às 14:42
**Tempo:** 5 minutos
**Status:** 🔴 EXECUTE IMEDIATAMENTE

---

## ⚡ COPIE E COLE ESTES 3 COMANDOS

### 📋 COMANDO 1: Sistema de WhatsApp (3 min)

**Abra:** Supabase SQL Editor

**Cole e execute:**

```sql
-- ============================================
-- SISTEMA DE WHATSAPP + NOTIFICAÇÕES CLIENTE
-- ============================================

-- Tabela de configurações WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_url TEXT NOT NULL DEFAULT 'https://api.tubaraoemprestimo.com.br',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salon_id)
);

-- Inserir configuração
INSERT INTO whatsapp_config (salon_id, instance_name, api_key, is_active)
SELECT id, 'syshair_daniel_cabelos_1777c2a7', 'B8959800-F546-407C-99E8-C40306E747F5', true
FROM salons WHERE is_active = true
ON CONFLICT (salon_id) DO UPDATE SET instance_name = EXCLUDED.instance_name;

-- Tabela de notificações para clientes
CREATE TABLE IF NOT EXISTS client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_salon ON client_notifications(salon_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_whatsapp ON client_notifications(whatsapp_sent);

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert client notifications" ON client_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Salon owners can view client notifications" ON client_notifications FOR SELECT
USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

-- Trigger para novo agendamento
CREATE OR REPLACE FUNCTION notify_client_new_appointment() RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_salon_name TEXT;
    v_message TEXT;
BEGIN
    SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM professionals WHERE id = NEW.professional_id;
    SELECT name INTO v_salon_name FROM salons WHERE id = NEW.salon_id;

    v_message := '🎉 *Agendamento Confirmado!*

📍 *Salão:* ' || v_salon_name || '
✂️ *Serviço:* ' || COALESCE(v_service_name, 'Serviço') || '
👤 *Profissional:* ' || COALESCE(v_professional_name, 'Qualquer disponível') || '
📅 *Data:* ' || to_char(NEW.date, 'DD/MM/YYYY') || '
⏰ *Horário:* ' || to_char(NEW.start_time, 'HH24:MI') || '

_Você pode cancelar ou reagendar até 2 horas antes do horário._';

    INSERT INTO client_notifications (salon_id, appointment_id, client_phone, client_name, type, title, message, metadata)
    VALUES (NEW.salon_id, NEW.id, NEW.client_phone, NEW.client_name, 'appointment_confirmed', 'Agendamento Confirmado', v_message,
            jsonb_build_object('service_name', v_service_name, 'professional_name', v_professional_name, 'date', NEW.date, 'time', NEW.start_time));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_client_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_client_new_appointment
    AFTER INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION notify_client_new_appointment();

-- Verificação
SELECT '✅ Sistema WhatsApp criado!' as status;
SELECT COUNT(*) as config_count FROM whatsapp_config;
SELECT COUNT(*) as triggers_count FROM information_schema.triggers WHERE trigger_name LIKE '%notify_client%';
```

---

### 🔒 COMANDO 2: Prevenir Duplicados (30 seg)

**Cole e execute:**

```sql
-- Prevenir agendamentos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique
ON appointments(salon_id, professional_id, date, start_time)
WHERE status != 'cancelled';

SELECT '✅ Constraint de duplicados criada!' as status;
```

---

### 🔌 COMANDO 3: Habilitar Realtime (30 seg)

**Cole e execute:**

```sql
-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;

-- Verificar
SELECT '✅ Realtime habilitado!' as status;
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename LIKE '%notifications';
```

**Deve retornar:**
```
admin_notifications
client_notifications
```

---

## ✅ PRONTO! Agora teste:

### 🧪 TESTE RÁPIDO

1. **Criar agendamento:**
   - Abra: `http://localhost:5173/agendar`
   - Use SEU número de WhatsApp
   - Complete o agendamento

2. **Verificar notificação criada:**

```sql
SELECT
    id,
    type,
    client_name,
    client_phone,
    whatsapp_sent,
    created_at
FROM client_notifications
ORDER BY created_at DESC
LIMIT 3;
```

**Deve aparecer sua notificação com `whatsapp_sent = false`**

3. **Processar WhatsApp (Cole no Console do navegador - F12):**

```javascript
const processWhatsApp = async () => {
  const { data: pending } = await supabase
    .from('client_notifications')
    .select('*')
    .eq('whatsapp_sent', false)
    .limit(10);

  console.log('📱 Pendentes:', pending?.length);

  for (const n of pending || []) {
    const phone = n.client_phone.replace(/\D/g, '');

    const res = await fetch(
      'https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
        },
        body: JSON.stringify({ number: phone, text: n.message })
      }
    );

    if (res.ok) {
      console.log('✅ Enviado para', phone);
      await supabase
        .from('client_notifications')
        .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
        .eq('id', n.id);
    } else {
      console.error('❌ Erro:', await res.text());
    }
  }
};

processWhatsApp();
```

4. **Verificar WhatsApp:**
   - ✅ Você deve receber a mensagem no seu WhatsApp!

---

## 📊 VERIFICAÇÃO FINAL

```sql
-- Status completo
SELECT '=== SISTEMA COMPLETO ===' as info;

SELECT
    'Admin notifications' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE read = false) as pendentes
FROM admin_notifications
UNION ALL
SELECT
    'Client notifications',
    COUNT(*),
    COUNT(*) FILTER (WHERE whatsapp_sent = false)
FROM client_notifications;

SELECT '=== TRIGGERS ===' as info;
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify%'
ORDER BY trigger_name;
```

---

## 🎉 RESULTADO ESPERADO

```
✅ Admin recebe notificação no sino
✅ Cliente recebe WhatsApp automaticamente
✅ Não cria agendamentos duplicados
✅ Sistema 100% funcional
```

---

**EXECUTE OS 3 COMANDOS AGORA E ME AVISE! 🚀**
