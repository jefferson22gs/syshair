// Edge Function: Disparo Automático de Aniversário
// Executa diariamente via cron job
// Envia mensagens de parabéns para clientes aniversariantes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

/**
 * Templates de mensagens de aniversário
 */
const BIRTHDAY_TEMPLATES = [
    {
        id: 1,
        name: "Clássico Elegante",
        message: (name: string, salonName: string, discount?: number) => {
            let msg = `🎉🎂 *Feliz Aniversário, ${name}!* 🎂🎉\n\n`;
            msg += `A equipe *${salonName}* deseja um dia repleto de alegria, amor e realizações! ✨\n\n`;
            if (discount) {
                msg += `🎁 *Presente Especial:*\n`;
                msg += `Ganhe *${discount}% de desconto* em qualquer serviço durante todo o mês do seu aniversário! 🎊\n\n`;
            }
            msg += `Que este novo ciclo seja cheio de beleza, saúde e felicidade! 💖\n\n`;
            msg += `Estamos te esperando para comemorar juntos! 🥳`;
            return msg;
        }
    },
    {
        id: 2,
        name: "Moderno e Descontraído",
        message: (name: string, salonName: string, discount?: number) => {
            let msg = `🎈 Eeeeeba! Hoje é dia de festa! 🎈\n\n`;
            msg += `*${name}*, a gente aqui do *${salonName}* tá comemorando com você! 🥳\n\n`;
            if (discount) {
                msg += `🎁 E olha o presente:\n`;
                msg += `*${discount}% OFF* em todos os serviços durante o mês inteiro! 🔥\n\n`;
            }
            msg += `Bora ficar ainda mais linda(o) nesse novo ano de vida? 💇‍♀️✨\n\n`;
            msg += `Muita saúde, amor e cabelo perfeito pra você! 😍`;
            return msg;
        }
    },
    {
        id: 3,
        name: "Luxo e Sofisticação",
        message: (name: string, salonName: string, discount?: number) => {
            let msg = `✨ *${name}* ✨\n\n`;
            msg += `Hoje é um dia especial e nós do *${salonName}* não poderíamos deixar passar em branco! 🌟\n\n`;
            msg += `Desejamos que este novo ano de vida seja repleto de conquistas, beleza e autoestima elevada! 💎\n\n`;
            if (discount) {
                msg += `🎁 *Seu Presente VIP:*\n`;
                msg += `${discount}% de desconto exclusivo em todos os nossos serviços durante o mês do seu aniversário.\n\n`;
            }
            msg += `Você merece se sentir especial todos os dias! 👑\n\n`;
            msg += `Feliz Aniversário! 🎂🍾`;
            return msg;
        }
    },
    {
        id: 4,
        name: "Carinhoso e Acolhedor",
        message: (name: string, salonName: string, discount?: number) => {
            let msg = `💝 Querida(o) *${name}*, 💝\n\n`;
            msg += `Hoje é o seu dia e nós do *${salonName}* queremos te abraçar virtualmente! 🤗\n\n`;
            msg += `Que você continue sendo essa pessoa incrível, iluminando a vida de todos ao seu redor! ☀️\n\n`;
            if (discount) {
                msg += `🎁 Preparamos um presentinho:\n`;
                msg += `*${discount}% de desconto* em qualquer serviço durante todo o mês! 🎀\n\n`;
            }
            msg += `Venha nos visitar e deixe a gente te mimar ainda mais! 💆‍♀️✨\n\n`;
            msg += `Feliz Aniversário com muito carinho! 💖🎂`;
            return msg;
        }
    },
    {
        id: 5,
        name: "Motivacional e Inspirador",
        message: (name: string, salonName: string, discount?: number) => {
            let msg = `🌟 *${name}*, hoje é o SEU dia! 🌟\n\n`;
            msg += `A equipe *${salonName}* celebra com você mais um ano de vida, conquistas e aprendizados! 🎯\n\n`;
            msg += `Que este novo ciclo traga:\n`;
            msg += `✨ Mais autoconfiança\n`;
            msg += `💪 Mais força para realizar seus sonhos\n`;
            msg += `💖 Mais amor próprio\n`;
            msg += `🌈 Mais momentos felizes\n\n`;
            if (discount) {
                msg += `🎁 E para começar bem:\n`;
                msg += `*${discount}% OFF* em todos os serviços este mês! 🎊\n\n`;
            }
            msg += `Você é incrível e merece tudo de melhor! 👏\n\n`;
            msg += `Feliz Aniversário! 🎂🎉`;
            return msg;
        }
    }
];

/**
 * Formata número de telefone
 */
function formatPhoneNumber(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) return cleaned;
    if (cleaned.length === 11 && !cleaned.startsWith('55')) return '55' + cleaned;
    if (cleaned.length === 10 && !cleaned.startsWith('55')) return '55' + cleaned;
    return null;
}

/**
 * Envia mensagem via WhatsApp
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

        console.log("🎂 Starting birthday messages job...");

        // Data de hoje (dia e mês)
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate(); // 1-31

        // Buscar todos os salões ativos com WhatsApp configurado
        const { data: salons, error: salonsError } = await supabase
            .from("salons")
            .select("id, name, whatsapp_instance_name, birthday_discount_percent")
            .not("whatsapp_instance_name", "is", null)
            .eq("is_active", true);

        if (salonsError || !salons || salons.length === 0) {
            console.log("No active salons with WhatsApp configured");
            return new Response(
                JSON.stringify({ success: true, message: "No salons to process" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let totalSent = 0;
        let totalFailed = 0;

        // Para cada salão
        for (const salon of salons) {
            console.log(`Processing salon: ${salon.name}`);

            // Buscar clientes aniversariantes do dia
            const { data: clients, error: clientsError } = await supabase
                .from("clients")
                .select("id, name, phone, birth_date")
                .eq("salon_id", salon.id)
                .not("phone", "is", null)
                .not("birth_date", "is", null);

            if (clientsError || !clients) {
                console.error(`Error fetching clients for salon ${salon.id}:`, clientsError);
                continue;
            }

            // Filtrar aniversariantes do dia
            const birthdayClients = clients.filter(client => {
                if (!client.birth_date) return false;
                const birthDate = new Date(client.birth_date);
                return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
            });

            console.log(`Found ${birthdayClients.length} birthday clients for ${salon.name}`);

            // Enviar mensagem para cada aniversariante
            for (const client of birthdayClients) {
                const formattedPhone = formatPhoneNumber(client.phone);
                if (!formattedPhone) {
                    console.log(`Invalid phone for client ${client.name}`);
                    totalFailed++;
                    continue;
                }

                // Escolher template aleatório
                const template = BIRTHDAY_TEMPLATES[Math.floor(Math.random() * BIRTHDAY_TEMPLATES.length)];
                const message = template.message(
                    client.name,
                    salon.name,
                    salon.birthday_discount_percent || 10 // 10% padrão
                );

                // Enviar mensagem
                const sent = await sendWhatsAppMessage(
                    salon.whatsapp_instance_name,
                    formattedPhone,
                    message
                );

                if (sent) {
                    totalSent++;
                    console.log(`✅ Birthday message sent to ${client.name}`);

                    // Registrar log
                    await supabase.from("whatsapp_logs").insert({
                        salon_id: salon.id,
                        client_id: client.id,
                        recipient_phone: formattedPhone,
                        recipient_name: client.name,
                        message_type: "birthday",
                        message_content: message,
                        status: "sent",
                        sent_at: new Date().toISOString()
                    });
                } else {
                    totalFailed++;
                    console.log(`❌ Failed to send to ${client.name}`);
                }

                // Aguardar 3 segundos entre mensagens
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log(`🎂 Birthday job completed: ${totalSent} sent, ${totalFailed} failed`);

        return new Response(
            JSON.stringify({
                success: true,
                sent: totalSent,
                failed: totalFailed,
                message: `Birthday messages processed: ${totalSent} sent, ${totalFailed} failed`
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
