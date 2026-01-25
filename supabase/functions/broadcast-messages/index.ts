// Supabase Edge Function: broadcast-messages
// Dispara mensagens em massa com proteção contra bloqueio

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Evolution API Config
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

// Configurações de proteção contra bloqueio
const RATE_LIMITS = {
    messageInterval: 4000, // 4 segundos entre cada mensagem
    batchSize: 30, // 30 mensagens por lote
    batchPause: 900000, // 15 minutos de pausa entre lotes
    maxPerHour: 60, // Máximo 60 mensagens por hora
    maxPerDay: 500, // Máximo 500 mensagens por dia
    errorThreshold: 0.1, // Para se 10% das mensagens falharem
};

interface BroadcastRequest {
    action: 'fetch_contacts' | 'send_broadcast' | 'get_status';
    salonId: string;
    instanceName: string;
    message?: string;
    recipients?: string[];
    broadcastId?: string;
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

        const body: BroadcastRequest = await req.json();
        const { action, salonId, instanceName } = body;

        switch (action) {
            case 'fetch_contacts':
                return await fetchContacts(instanceName, salonId, supabase);

            case 'send_broadcast':
                return await sendBroadcast(body, supabase);

            case 'get_status':
                return await getBroadcastStatus(body.broadcastId!, supabase);

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function fetchContacts(instanceName: string, salonId: string, supabase: any) {
    console.log("Fetching contacts for instance:", instanceName);

    // 1. Buscar contatos do WhatsApp via Evolution API
    const whatsappContacts: any[] = [];
    try {
        const response = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                for (const contact of data) {
                    // Ignorar grupos (@g.us) e status (@broadcast)
                    if (contact.id?.includes("@s.whatsapp.net")) {
                        whatsappContacts.push({
                            phone: contact.id.replace("@s.whatsapp.net", ""),
                            name: contact.pushName || contact.name || "Sem nome",
                            source: "whatsapp"
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching WhatsApp contacts:", error);
    }

    // 2. Buscar clientes do banco de dados
    const { data: dbClients } = await supabase
        .from("clients")
        .select("id, name, phone")
        .eq("salon_id", salonId)
        .not("phone", "is", null);

    const dbContacts = (dbClients || []).map((client: any) => ({
        id: client.id,
        phone: client.phone.replace(/\D/g, ""),
        name: client.name,
        source: "database"
    }));

    // 3. Mesclar e remover duplicatas (por telefone)
    const allContacts = [...dbContacts];
    const existingPhones = new Set(dbContacts.map((c: any) => c.phone));

    for (const contact of whatsappContacts) {
        if (!existingPhones.has(contact.phone)) {
            allContacts.push(contact);
            existingPhones.add(contact.phone);
        }
    }

    console.log(`Found ${allContacts.length} unique contacts`);

    return new Response(
        JSON.stringify({
            success: true,
            contacts: allContacts,
            stats: {
                fromDatabase: dbContacts.length,
                fromWhatsApp: whatsappContacts.length,
                total: allContacts.length
            }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function sendBroadcast(request: BroadcastRequest, supabase: any) {
    const { salonId, instanceName, message, recipients } = request;

    if (!message || !recipients || recipients.length === 0) {
        return new Response(
            JSON.stringify({ error: "Message and recipients are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Verificar limites diários
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
        .from("broadcast_messages")
        .select("id")
        .eq("salon_id", salonId)
        .gte("created_at", `${today}T00:00:00`)
        .eq("status", "sent");

    const sentToday = todayStats?.length || 0;
    if (sentToday + recipients.length > RATE_LIMITS.maxPerDay) {
        return new Response(
            JSON.stringify({
                error: `Limite diário atingido. Você já enviou ${sentToday} mensagens hoje. Limite: ${RATE_LIMITS.maxPerDay}`,
                remaining: RATE_LIMITS.maxPerDay - sentToday
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Criar registro do broadcast
    const { data: broadcast, error: broadcastError } = await supabase
        .from("broadcasts")
        .insert({
            salon_id: salonId,
            message: message,
            total_recipients: recipients.length,
            status: "processing",
        })
        .select()
        .single();

    if (broadcastError) {
        throw new Error("Failed to create broadcast: " + broadcastError.message);
    }

    const broadcastId = broadcast.id;

    // Enviar mensagens em background (não bloquear a resposta)
    // Em produção, usaríamos um job queue como pg_cron ou um worker
    processMessages(broadcastId, instanceName, message, recipients, salonId, supabase);

    return new Response(
        JSON.stringify({
            success: true,
            broadcastId: broadcastId,
            message: `Disparo iniciado para ${recipients.length} contatos`,
            estimatedTime: Math.ceil((recipients.length * RATE_LIMITS.messageInterval) / 60000) + " minutos"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function processMessages(
    broadcastId: string,
    instanceName: string,
    message: string,
    recipients: string[],
    salonId: string,
    supabase: any
) {
    console.log(`Starting broadcast ${broadcastId} to ${recipients.length} recipients`);

    let sent = 0;
    let failed = 0;
    let errors: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
        const phone = recipients[i].replace(/\D/g, "");
        const remoteJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;

        try {
            // Enviar mensagem via Evolution API
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

            const result = await response.json();

            // Salvar resultado
            await supabase.from("broadcast_messages").insert({
                broadcast_id: broadcastId,
                salon_id: salonId,
                phone: phone,
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : (result.message || "Unknown error"),
                whatsapp_message_id: result.key?.id || null,
            });

            if (response.ok) {
                sent++;
                console.log(`[${i + 1}/${recipients.length}] Sent to ${phone}`);
            } else {
                failed++;
                errors.push(`${phone}: ${result.message || "Error"}`);
            }

            // Verificar taxa de erro
            if (failed > 0 && (failed / (sent + failed)) > RATE_LIMITS.errorThreshold) {
                console.error("Error threshold exceeded, stopping broadcast");
                await supabase.from("broadcasts").update({
                    status: "stopped",
                    sent_count: sent,
                    failed_count: failed,
                    error_message: "Parado automaticamente: muitos erros",
                }).eq("id", broadcastId);
                return;
            }

            // Aguardar intervalo entre mensagens
            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.messageInterval));
            }

            // Pausa a cada lote
            if ((i + 1) % RATE_LIMITS.batchSize === 0 && i < recipients.length - 1) {
                console.log(`Batch complete, pausing for ${RATE_LIMITS.batchPause / 60000} minutes...`);
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.batchPause));
            }

        } catch (error: any) {
            console.error(`Error sending to ${phone}:`, error);
            failed++;

            await supabase.from("broadcast_messages").insert({
                broadcast_id: broadcastId,
                salon_id: salonId,
                phone: phone,
                status: "failed",
                error_message: error.message,
            });
        }
    }

    // Atualizar status final do broadcast
    await supabase.from("broadcasts").update({
        status: "completed",
        sent_count: sent,
        failed_count: failed,
        completed_at: new Date().toISOString(),
    }).eq("id", broadcastId);

    console.log(`Broadcast ${broadcastId} completed: ${sent} sent, ${failed} failed`);
}

async function getBroadcastStatus(broadcastId: string, supabase: any) {
    const { data: broadcast } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("id", broadcastId)
        .single();

    if (!broadcast) {
        return new Response(
            JSON.stringify({ error: "Broadcast not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { data: messages } = await supabase
        .from("broadcast_messages")
        .select("phone, status, error_message, created_at")
        .eq("broadcast_id", broadcastId)
        .order("created_at", { ascending: true });

    return new Response(
        JSON.stringify({
            success: true,
            broadcast,
            messages: messages || [],
            progress: {
                total: broadcast.total_recipients,
                sent: broadcast.sent_count || 0,
                failed: broadcast.failed_count || 0,
                pending: broadcast.total_recipients - (broadcast.sent_count || 0) - (broadcast.failed_count || 0)
            }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
