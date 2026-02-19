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

/**
 * Formata número de telefone brasileiro
 */
function formatPhoneNumber(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned;
    }

    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
        return '55' + cleaned;
    }

    if (cleaned.length === 10 && !cleaned.startsWith('55')) {
        return '55' + cleaned;
    }

    return null;
}

/**
 * Formata data para exibição
 */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Gera mensagem de confirmação personalizada
 */
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

/**
 * Envia mensagem via Evolution API
 */
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

        // Buscar dados do salão
        const { data: salon, error: salonError } = await supabase
            .from("salons")
            .select("name, pix_key, whatsapp_instance_name")
            .eq("id", appointment.salon_id)
            .single();

        if (salonError || !salon) {
            throw new Error("Salon not found");
        }

        // Verificar se tem instância do WhatsApp configurada
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

        // Formatar telefone do cliente
        const formattedPhone = formatPhoneNumber(appointment.client_phone);
        if (!formattedPhone) {
            throw new Error("Invalid phone number format");
        }

        // Gerar mensagem de confirmação
        const message = generateConfirmationMessage(
            appointment,
            salon.name,
            salon.pix_key
        );

        // Enviar WhatsApp
        const sent = await sendWhatsAppMessage(
            salon.whatsapp_instance_name,
            formattedPhone,
            message
        );

        if (sent) {
            // Registrar log de envio
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
