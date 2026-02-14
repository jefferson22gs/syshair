// Versão melhorada do broadcast-messages com tratamento robusto de erros
// Problema: API Evolution retornando erros não descritos = "Unknown error"
// Solução: Continuar enviando mesmo com erros, não parar rapidamente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

// Configurações MUDADAS para melhor tolerância a falhas
const RATE_LIMITS = {
    messageInterval: 5000, // 5 segundos
    batchSize: 20, // 20 mensagens por lote
    batchPause: 600000, // 10 minutos entre lotes
    maxPerHour: 60,
    maxPerDay: 500,
    maxConsecutiveFailures: 50, // AUMENTADO de 5 para 50 - não parar tão rápido
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

    const allContacts = [...dbContacts];
    const existingPhones = new Set(dbContacts.map((c: any) => c.phone));

    for (const contact of whatsappContacts) {
        if (!existingPhones.has(contact.phone)) {
            allContacts.push(contact);
            existingPhones.add(contact.phone);
        }
    }

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
    console.log(`=== BROADCAST ${broadcastId} STARTED ===`);
    console.log(`Recipients: ${recipients.length}`);
    console.log(`API: ${EVOLUTION_API_URL}`);
    console.log(`Instance: ${instanceName}`);

    let sent = 0;
    let failed = 0;
    let errors: string[] = [];
    let consecutiveFailures = 0;

    for (let i = 0; i < recipients.length; i++) {
        try {
            const phone = recipients[i].replace(/\D/g, "");
            
            if (!phone || phone.length < 10 || phone.length > 15) {
                console.log(`[SKIPPING] Invalid phone: ${phone}`);
                failed++;
                await supabase.from("broadcast_messages").insert({
                    broadcast_id: broadcastId,
                    salon_id: salonId,
                    phone: phone,
                    status: "failed",
                    error_message: "Número inválido",
                });
                continue;
            }

            const remoteJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
            console.log(`[${i + 1}/${recipients.length}] SENDING: ${remoteJid}`);

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

            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = { error: "Could not parse response" };
            }

            const messageData = {
                broadcast_id: broadcastId,
                salon_id: salonId,
                phone: phone,
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : (JSON.stringify(result)?.substring(0, 500)),
                whatsapp_message_id: result.key?.id || result.messageId || null,
            };

            await supabase.from("broadcast_messages").insert(messageData);

            if (response.ok && result.key) {
                sent++;
                consecutiveFailures = 0;
                console.log(`[SUCCESS] ${phone} (ID: ${result.key.id})`);
            } else {
                failed++;
                consecutiveFailures++;
                const errorMsg = JSON.stringify(result)?.substring(0, 200);
                errors.push(`${phone}: ${errorMsg}`);
                console.log(`[FAILED] ${phone} - ${errorMsg}`);

                // SÓ pausa após MUITAS falhas consecutivas (50)
                if (consecutiveFailures >= RATE_LIMITS.maxConsecutiveFailures) {
                    console.log(`[PAUSE] ${consecutiveFailures} consecutive failures, pausing 60s...`);
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    consecutiveFailures = 0;
                }
            }

            if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
                await supabase.from("broadcasts").update({
                    sent_count: sent,
                    failed_count: failed,
                }).eq("id", broadcastId);
            }

            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.messageInterval));
            }

            if ((i + 1) % RATE_LIMITS.batchSize === 0 && i < recipients.length - 1) {
                console.log(`[BATCH PAUSE] Pausing for ${RATE_LIMITS.batchPause / 60000} minutes...`);
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.batchPause));
            }

        } catch (error: any) {
            console.log(`[EXCEPTION] ${recipients[i]}: ${error.message}`);
            failed++;
            consecutiveFailures++;

            await supabase.from("broadcast_messages").insert({
                broadcast_id: broadcastId,
                salon_id: salonId,
                phone: recipients[i],
                status: "failed",
                error_message: error.message?.substring(0, 500),
            });

            if (consecutiveFailures >= RATE_LIMITS.maxConsecutiveFailures) {
                console.log(`[PAUSE] ${consecutiveFailures} consecutive exceptions, pausing 60s...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
                consecutiveFailures = 0;
            }
        }
    }

    const finalStatus = sent > 0 ? "completed" : "failed";
    console.log(`=== BROADCAST ${broadcastId} FINISHED ===`);
    console.log(`Status: ${finalStatus}`);
    console.log(`Sent: ${sent}, Failed: ${failed}`);
    console.log(`Total: ${recipients.length}`);
    console.log(`Success rate: ${((sent / recipients.length) * 100).toFixed(1)}%`);

    await supabase.from("broadcasts").update({
        status: finalStatus,
        sent_count: sent,
        failed_count: failed,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
    }).eq("id", broadcastId);
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
