# 🚀 DEPLOY MANUAL DAS EDGE FUNCTIONS - PASSO A PASSO

**Data:** 2026-02-18 19:03
**Método:** Via Dashboard do Supabase (Mais fácil!)

---

## 📋 PASSO 1: Acessar Edge Functions

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
3. Faça login se necessário

---

## 🔧 PASSO 2: Criar Function 1 - auto-appointment-confirmation

### 2.1 Criar a Function
1. Clique no botão **"Create a new function"** (ou "+ New Edge Function")
2. Preencha:
   - **Function name:** `auto-appointment-confirmation`
   - Deixe as outras opções padrão
3. Clique em **"Create function"**

### 2.2 Colar o Código
1. No editor que abrir, **DELETE TODO O CÓDIGO** que vier por padrão
2. Copie o código abaixo e cole no editor:

```typescript
// Edge Function: Confirmação Automática de Agendamento via WhatsApp
// Dispara automaticamente quando um novo agendamento é criado
// Envia mensagem de confirmação com detalhes e chave PIX

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

interface AppointmentData {
    id: string;
    salon_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    service_name: string;
    professional_name?: string;
    appointment_date: string;
    appointment_time: string;
    total_price: number;
    status: string;
}

function formatPhoneNumber(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) return cleaned;
    if (cleaned.length === 11 && !cleaned.startsWith('55')) return '55' + cleaned;
    if (cleaned.length === 10 && !cleaned.startsWith('55')) return '55' + cleaned;
    return null;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function generateConfirmationMessage(appointment: AppointmentData, salonName: string, pixKey?: string): string {
    const date = formatDate(appointment.appointment_date);
    const time = appointment.appointment_time;
    const professional = appointment.professional_name || "Qualquer profissional";

    let message = `🎉 *Agendamento Confirmado!*\n\n`;
    message += `Olá *${appointment.client_name}*! 👋\n\n`;
    message += `Seu agendamento foi confirmado com sucesso em *${salonName}*!\n\n`;
    message += `📋 *Detalhes do Agendamento:*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📅 *Data:* ${date}\n`;
    message += `🕐 *Horário:* ${time}\n`;
    message += `✂️ *Serviço:* ${appointment.service_name}\n`;
    message += `👤 *Profissional:* ${professional}\n`;
    message += `💰 *Valor:* R$ ${appointment.total_price.toFixed(2)}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (pixKey && appointment.total_price > 0) {
        message += `💳 *Pagamento via PIX:*\n`;
        message += `Chave PIX: \`${pixKey}\`\n`;
        message += `_(Toque para copiar)_\n\n`;
    }

    message += `⚠️ *Importante:*\n`;
    message += `• Chegue com 10 minutos de antecedência\n`;
    message += `• Em caso de cancelamento, avise com 24h de antecedência\n\n`;
    message += `📞 Dúvidas? Entre em contato conosco!\n\n`;
    message += `Aguardamos você! 💇‍♀️✨`;

    return message;
}

async function sendWhatsAppMessage(instanceName: string, phone: string, message: string): Promise<boolean> {
    try {
        const remoteJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
                number: remoteJid,
                text: message,
            }),
        });

        if (!response.ok) {
            console.error("Evolution API error:", await response.text());
            return false;
        }

        const result = await response.json();
        console.log("WhatsApp sent successfully:", result);
        return true;
    } catch (error) {
        console.error("Error sending WhatsApp:", error);
        return false;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const appointment: AppointmentData = await req.json();

        console.log("Processing appointment confirmation:", appointment.id);

        const { data: salon, error: salonError } = await supabase
            .from("salons")
            .select("name, pix_key, whatsapp_instance_name")
            .eq("id", appointment.salon_id)
            .single();

        if (salonError || !salon) {
            throw new Error("Salon not found");
        }

        if (!salon.whatsapp_instance_name) {
            console.log("No WhatsApp instance configured for salon");
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "WhatsApp não configurado"
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const formattedPhone = formatPhoneNumber(appointment.client_phone);
        if (!formattedPhone) {
            throw new Error("Invalid phone number format");
        }

        const message = generateConfirmationMessage(
            appointment,
            salon.name,
            salon.pix_key
        );

        const sent = await sendWhatsAppMessage(
            salon.whatsapp_instance_name,
            formattedPhone,
            message
        );

        if (sent) {
            await supabase.from("whatsapp_logs").insert({
                salon_id: appointment.salon_id,
                appointment_id: appointment.id,
                recipient_phone: formattedPhone,
                recipient_name: appointment.client_name,
                message_type: "appointment_confirmation",
                message_content: message,
                status: "sent",
                sent_at: new Date().toISOString()
            });
        }

        return new Response(
            JSON.stringify({
                success: sent,
                message: sent ? "Confirmação enviada via WhatsApp" : "Falha ao enviar WhatsApp"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
```

### 2.3 Deploy
1. Clique no botão **"Deploy"** (canto superior direito)
2. Aguarde o deploy concluir (aparecerá uma mensagem de sucesso)

---

## 🎂 PASSO 3: Criar Function 2 - auto-birthday-messages

### 3.1 Voltar para a lista
1. Clique na seta "←" ou volte para: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions

### 3.2 Criar a Function
1. Clique no botão **"Create a new function"**
2. Preencha:
   - **Function name:** `auto-birthday-messages`
3. Clique em **"Create function"**

### 3.3 Colar o Código
1. **DELETE TODO O CÓDIGO** padrão
2. Copie e cole o código do arquivo: `supabase/functions/auto-birthday-messages/index.ts`
3. (O código é muito longo, vou criar um arquivo separado para você copiar)

### 3.4 Deploy
1. Clique em **"Deploy"**
2. Aguarde concluir

---

## 🔐 PASSO 4: Configurar Secrets (Variáveis de Ambiente)

### 4.1 Acessar Settings
1. Vá para: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/settings/functions
2. Role até a seção **"Secrets"**

### 4.2 Adicionar EVOLUTION_API_URL
1. Clique em **"Add new secret"**
2. Preencha:
   - **Name:** `EVOLUTION_API_URL`
   - **Value:** `https://api.tubaraoemprestimo.com.br`
3. Clique em **"Save"**

### 4.3 Adicionar EVOLUTION_API_KEY
1. Clique em **"Add new secret"** novamente
2. Preencha:
   - **Name:** `EVOLUTION_API_KEY`
   - **Value:** `B8959800-F546-407C-99E8-C40306E747F5`
3. Clique em **"Save"**

---

## ⏰ PASSO 5: Configurar Cron Job (Aniversários Diários)

### 5.1 Acessar Database
1. Vá para: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/database/cron-jobs

### 5.2 Criar Cron Job
1. Clique em **"Create a new cron job"**
2. Preencha:
   - **Name:** `Birthday Messages Daily`
   - **Schedule:** `0 9 * * *` (Todos os dias às 9h UTC = 6h Brasília)
   - **Command:**
   ```sql
   SELECT net.http_post(
       url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
       headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
       ),
       body := '{}'::jsonb
   );
   ```
3. Clique em **"Create cron job"**

---

## ✅ PASSO 6: Verificar se Funcionou

### 6.1 Ver Functions Deployadas
1. Acesse: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/functions
2. Você deve ver:
   - ✅ auto-appointment-confirmation
   - ✅ auto-birthday-messages

### 6.2 Ver Logs
1. Clique em uma das functions
2. Vá na aba **"Logs"**
3. Faça um teste de agendamento e veja os logs aparecerem

---

## 🧪 PASSO 7: Testar

### Teste 1: Fazer um Agendamento
1. Acesse: https://syshair.vercel.app/salon/SEU_SLUG
2. Faça um agendamento completo
3. Verifique se o WhatsApp foi enviado

### Teste 2: Testar Aniversários Manualmente
1. Vá para: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql
2. Execute:
```sql
SELECT net.http_post(
    url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/auto-birthday-messages',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
);
```

---

## 📊 CHECKLIST FINAL

- [ ] Function `auto-appointment-confirmation` criada
- [ ] Function `auto-birthday-messages` criada
- [ ] Secret `EVOLUTION_API_URL` configurado
- [ ] Secret `EVOLUTION_API_KEY` configurado
- [ ] Cron job criado
- [ ] Teste de agendamento realizado
- [ ] Logs verificados

---

## 🎯 PRÓXIMO PASSO

Configurar o salão com:
- WhatsApp Instance Name
- Chave PIX
- Ativar automações

Acesse: https://syshair.vercel.app/admin/settings

---

**Última Atualização:** 2026-02-18 19:03
**Status:** Aguardando deploy manual via Dashboard
