# 📋 PASSOS 3 E 4 - INSTRUÇÕES DE IMPLEMENTAÇÃO

## ✅ JÁ CONCLUÍDO

- ✅ Passo 1: AdminNotificationCenter integrado no AdminDashboard
- ✅ Passo 2: EnhancedSalonCalendar integrado em Appointments (com tabs)

---

## 🔧 PASSO 3: Redirecionar para Confirmação após Agendamento

### Onde implementar:

Procure nos arquivos onde o agendamento é criado:
- `src/pages/PublicBookingAdvanced.tsx`
- `src/pages/BookingFlow.tsx`
- `src/pages/Booking.tsx`
- Ou qualquer componente que crie agendamentos

### O que fazer:

1. **Encontre o código que cria o agendamento:**
```tsx
const { data: appointment, error } = await supabase
  .from("appointments")
  .insert({
    salon_id: salonId,
    service_id: serviceId,
    professional_id: professionalId,
    client_name: clientName,
    client_phone: clientPhone,
    date: date,
    start_time: startTime,
    end_time: endTime,
    // ... outros campos
  })
  .select()
  .single();
```

2. **Adicione o import do useNavigate:**
```tsx
import { useNavigate } from "react-router-dom";

// No componente:
const navigate = useNavigate();
```

3. **Após criar o agendamento com sucesso, redirecione:**
```tsx
if (appointment && !error) {
  // Redirecionar para página de confirmação
  navigate(`/appointment-confirmation?id=${appointment.id}`);
}
```

### Exemplo completo:

```tsx
import { useNavigate } from "react-router-dom";

const BookingComponent = () => {
  const navigate = useNavigate();

  const handleCreateAppointment = async () => {
    try {
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          // ... dados do agendamento
        })
        .select()
        .single();

      if (error) throw error;

      // Redirecionar para confirmação
      navigate(`/appointment-confirmation?id=${appointment.id}`);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao criar agendamento");
    }
  };

  return (
    // ... seu componente
  );
};
```

---

## 📱 PASSO 4: Enviar Link de Gerenciamento para o Cliente

### Opção A: Via WhatsApp (Recomendado)

Após criar o agendamento, envie uma mensagem via WhatsApp com o link de gerenciamento.

#### 4.1. Gerar o link de gerenciamento:

```tsx
const manageLink = `${window.location.origin}/manage-appointment?id=${appointment.id}&phone=${appointment.client_phone}`;
```

#### 4.2. Criar a mensagem:

```tsx
const whatsappMessage = `
🎉 *Agendamento Confirmado!*

📍 *Salão:* ${salonName}
✂️ *Serviço:* ${serviceName}
👤 *Profissional:* ${professionalName}
📅 *Data:* ${formatDate(appointment.date)}
⏰ *Horário:* ${appointment.start_time}

🔗 *Gerenciar agendamento:*
${manageLink}

_Você pode cancelar ou reagendar até 2 horas antes do horário._
`.trim();
```

#### 4.3. Enviar via Evolution API:

Se você já tem integração com Evolution API:

```tsx
// Após criar o agendamento
const sendWhatsAppMessage = async (phone: string, message: string) => {
  try {
    const response = await fetch('https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    if (!response.ok) throw new Error('Falha ao enviar WhatsApp');

    console.log('WhatsApp enviado com sucesso');
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
  }
};

// Usar após criar agendamento
if (appointment) {
  await sendWhatsAppMessage(appointment.client_phone, whatsappMessage);
  navigate(`/appointment-confirmation?id=${appointment.id}`);
}
```

#### 4.4. Ou criar Edge Function no Supabase:

Crie `supabase/functions/send-appointment-link/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { appointmentId, phone, salonName, serviceName, professionalName, date, time } = await req.json();

    const manageLink = `https://seu-dominio.com/manage-appointment?id=${appointmentId}&phone=${phone}`;

    const message = `
🎉 *Agendamento Confirmado!*

📍 *Salão:* ${salonName}
✂️ *Serviço:* ${serviceName}
👤 *Profissional:* ${professionalName}
📅 *Data:* ${date}
⏰ *Horário:* ${time}

🔗 *Gerenciar agendamento:*
${manageLink}

_Você pode cancelar ou reagendar até 2 horas antes do horário._
    `.trim();

    // Enviar via Evolution API
    const response = await fetch('https://api.tubaraoemprestimo.com.br/message/sendText/syshair_daniel_cabelos_1777c2a7', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'B8959800-F546-407C-99E8-C40306E747F5'
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    if (!response.ok) throw new Error('Falha ao enviar WhatsApp');

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

E chamar no frontend:

```tsx
// Após criar agendamento
await supabase.functions.invoke('send-appointment-link', {
  body: {
    appointmentId: appointment.id,
    phone: appointment.client_phone,
    salonName: salonName,
    serviceName: serviceName,
    professionalName: professionalName,
    date: formatDate(appointment.date),
    time: appointment.start_time
  }
});
```

---

### Opção B: Via Email (Se tiver email do cliente)

```tsx
// Criar Edge Function para enviar email
await supabase.functions.invoke('send-email', {
  body: {
    to: appointment.client_email,
    subject: 'Agendamento Confirmado - ' + salonName,
    html: `
      <h2>🎉 Agendamento Confirmado!</h2>
      <p><strong>Salão:</strong> ${salonName}</p>
      <p><strong>Serviço:</strong> ${serviceName}</p>
      <p><strong>Profissional:</strong> ${professionalName}</p>
      <p><strong>Data:</strong> ${formatDate(appointment.date)}</p>
      <p><strong>Horário:</strong> ${appointment.start_time}</p>
      <br>
      <a href="${manageLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
        Gerenciar Agendamento
      </a>
      <br><br>
      <p style="color: #666; font-size: 14px;">
        Você pode cancelar ou reagendar até 2 horas antes do horário.
      </p>
    `
  }
});
```

---

### Opção C: Mostrar Link na Tela (Simples)

Na página de confirmação (`AppointmentConfirmation.tsx`), já existe um botão para copiar o link:

```tsx
<Button onClick={copyManageLink}>
  {copied ? "Link Copiado!" : "Copiar Link de Gerenciamento"}
</Button>
```

O cliente pode copiar e salvar o link manualmente.

---

## 🧪 COMO TESTAR

### Teste Completo do Fluxo:

1. **Criar um agendamento** (como cliente na página pública)
2. **Verificar redirecionamento** para `/appointment-confirmation?id=...`
3. **Verificar se recebeu WhatsApp** com o link de gerenciamento
4. **Clicar no link** do WhatsApp
5. **Testar cancelamento** na página de gerenciamento
6. **Verificar notificação** no dashboard do admin

---

## 📝 CHECKLIST FINAL

- [ ] Encontrar arquivo onde agendamento é criado
- [ ] Adicionar `useNavigate` e redirecionar para `/appointment-confirmation`
- [ ] Implementar envio de WhatsApp com link de gerenciamento
- [ ] Testar fluxo completo de agendamento
- [ ] Testar recebimento do link via WhatsApp
- [ ] Testar cancelamento pelo cliente
- [ ] Verificar notificação no admin

---

## 💡 DICAS

1. **Busque por "insert" e "appointments"** nos arquivos de booking para encontrar onde criar o redirecionamento
2. **Use o Evolution API** que já está configurado no projeto
3. **Teste primeiro localmente** antes de fazer deploy
4. **Salve as credenciais da API** em variáveis de ambiente

---

**Última atualização:** 23/02/2026 às 00:56
**Status:** Passos 1 e 2 concluídos, 3 e 4 aguardando implementação
