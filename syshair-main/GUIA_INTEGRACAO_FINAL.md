# ✅ GUIA DE INTEGRAÇÃO FINAL - COMPONENTES NO DASHBOARD

## 🎯 STATUS ATUAL

✅ Migration SQL aplicada no Supabase
✅ Rotas públicas adicionadas no App.tsx
✅ Código no GitHub atualizado

---

## 📋 PRÓXIMOS PASSOS

### 1️⃣ Integrar AdminNotificationCenter no Dashboard

**Arquivo:** `src/pages/admin/AdminDashboard.tsx`

Adicione no topo do arquivo:
```tsx
import { AdminNotificationCenter } from "@/components/admin/AdminNotificationCenter";
```

Adicione no layout (sugestão: no topo da página, antes dos cards):
```tsx
<div className="space-y-6">
  {/* Notificações */}
  <AdminNotificationCenter />

  {/* Resto do dashboard... */}
</div>
```

---

### 2️⃣ Integrar EnhancedSalonCalendar na Página de Agendamentos

**Opção A:** Substituir a agenda atual em `src/pages/admin/Appointments.tsx`

```tsx
import { EnhancedSalonCalendar } from "@/components/admin/EnhancedSalonCalendar";

// No componente:
<EnhancedSalonCalendar />
```

**Opção B:** Adicionar como uma aba/seção adicional

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedSalonCalendar } from "@/components/admin/EnhancedSalonCalendar";

<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">Lista</TabsTrigger>
    <TabsTrigger value="calendar">Agenda Completa</TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    {/* Agenda atual */}
  </TabsContent>

  <TabsContent value="calendar">
    <EnhancedSalonCalendar />
  </TabsContent>
</Tabs>
```

---

### 3️⃣ Integrar AddToGoogleCalendar no Fluxo de Agendamento

**Arquivo:** Onde o agendamento é confirmado (ex: `src/pages/BookingFlow.tsx` ou similar)

Após criar o agendamento com sucesso, redirecione para a página de confirmação:

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// Após criar agendamento:
const { data: appointment } = await supabase
  .from("appointments")
  .insert({ ... })
  .select()
  .single();

if (appointment) {
  // Redirecionar para página de confirmação
  navigate(`/appointment-confirmation?id=${appointment.id}`);
}
```

---

### 4️⃣ Enviar Link de Gerenciamento para o Cliente

**Opção A:** Via WhatsApp (recomendado)

Após criar o agendamento, envie uma mensagem via WhatsApp com o link:

```tsx
const manageLink = `${window.location.origin}/manage-appointment?id=${appointment.id}&phone=${appointment.client_phone}`;

const message = `
🎉 Agendamento Confirmado!

📍 ${salonName}
✂️ ${serviceName}
📅 ${date} às ${time}

🔗 Gerenciar agendamento:
${manageLink}

Você pode cancelar ou reagendar até 2 horas antes.
`;

// Enviar via Evolution API ou mostrar para copiar
```

**Opção B:** Via Email (se tiver email do cliente)

```tsx
// Usar edge function para enviar email
await supabase.functions.invoke('send-email', {
  body: {
    to: appointment.client_email,
    subject: 'Agendamento Confirmado',
    html: `
      <h2>Agendamento Confirmado!</h2>
      <p>Seu agendamento foi confirmado com sucesso.</p>
      <a href="${manageLink}">Gerenciar Agendamento</a>
    `
  }
});
```

---

## 🧪 TESTES RECOMENDADOS

### Teste 1: Notificações
1. Crie um agendamento manualmente no admin
2. Verifique se a notificação aparece no AdminNotificationCenter
3. Clique na notificação e veja os detalhes
4. Marque como lida

### Teste 2: Cancelamento pelo Cliente
1. Crie um agendamento
2. Acesse o link: `/manage-appointment?id={id}&phone={phone}`
3. Clique em "Cancelar"
4. Preencha o motivo
5. Confirme
6. Verifique se a notificação aparece no admin

### Teste 3: Reagendamento pelo Cliente
1. Acesse o link de gerenciamento
2. Clique em "Reagendar"
3. Selecione nova data e horário
4. Confirme
5. Verifique se a notificação aparece no admin

### Teste 4: Google Calendar
1. Crie um agendamento
2. Acesse `/appointment-confirmation?id={id}`
3. Clique em "Adicionar ao Google Calendar"
4. Verifique se abre o Google Calendar com os dados corretos

### Teste 5: Agenda Completa
1. Acesse a página de agendamentos do admin
2. Verifique se os horários vagos aparecem em verde
3. Clique em um horário vago
4. Preencha o formulário
5. Crie o agendamento
6. Verifique se aparece na agenda

---

## 📊 CHECKLIST FINAL

- [ ] Adicionar AdminNotificationCenter no AdminDashboard.tsx
- [ ] Adicionar EnhancedSalonCalendar em Appointments.tsx
- [ ] Redirecionar para /appointment-confirmation após agendamento
- [ ] Enviar link de gerenciamento para o cliente (WhatsApp/Email)
- [ ] Testar notificação de novo agendamento
- [ ] Testar notificação de cancelamento
- [ ] Testar notificação de reagendamento
- [ ] Testar cancelamento pelo cliente
- [ ] Testar reagendamento pelo cliente
- [ ] Testar botão Google Calendar
- [ ] Testar adicionar agendamento manual na agenda
- [ ] Testar horários vagos e ocupados

---

## 🎨 CUSTOMIZAÇÕES OPCIONAIS

### Personalizar Cores das Notificações
Edite `src/components/admin/AdminNotificationCenter.tsx`:
```tsx
const getNotificationColor = (type: string) => {
  switch (type) {
    case "new_appointment":
      return "bg-blue-500/10 border-blue-500/30"; // Mudar para sua cor
    // ...
  }
};
```

### Personalizar Horários da Agenda
Edite `src/components/admin/EnhancedSalonCalendar.tsx`:
```tsx
// Linha ~150: Mudar horários
for (let hour = 8; hour <= 20; hour++) { // Mudar 8 e 20
```

### Personalizar Tempo Mínimo para Cancelamento
Edite `src/pages/ManageAppointment.tsx`:
```tsx
// Linha ~200: Mudar de 2 horas para outro valor
const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
return hoursUntil > 2; // Mudar 2 para o valor desejado
```

---

## 🚀 DEPLOY

Após integrar tudo:

1. **Teste localmente:**
   ```bash
   npm run dev
   ```

2. **Commit e push:**
   ```bash
   git add .
   git commit -m "feat: integrar componentes de notificações e agenda no dashboard"
   git push origin main
   ```

3. **Deploy automático** via Vercel/Netlify

---

## 📞 SUPORTE

Se encontrar algum problema:

1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Verifique se a migration foi aplicada corretamente
4. Verifique se as rotas foram adicionadas

---

**Última atualização:** 23/02/2026 às 00:29
**Status:** Pronto para integração
