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
    maxPerDay: 5000,
    maxConsecutiveFailures: 50, // AUMENTADO de 5 para 50 - não parar tão rápido
    maxRetries: 3, // Número máximo de tentativas por mensagem
    retryDelay: 2000, // Delay entre retries (2 segundos)
};

/**
 * Valida e formata número de telefone brasileiro
 * Aceita formatos: 5511999999999, 11999999999, (11) 99999-9999, etc.
 * Retorna número formatado com DDI 55 ou null se inválido
 */
function formatPhoneNumber(phone: string): string | null {
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');

    // Valida formato brasileiro
    // Deve ter 12 ou 13 dígitos (55 + DDD + número)
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned; // 5511999999999
    }

    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
        return '55' + cleaned; // 11999999999 -> 5511999999999
    }

    if (cleaned.length === 10 && !cleaned.startsWith('55')) {
        return '55' + cleaned; // 1199999999 -> 551199999999
    }

    // Formato inválido
    return null;
}

/**
 * Envia mensagem com retry automático
 * Tenta até maxRetries vezes com delay entre tentativas
 */
async function sendMessageWithRetry(
    instanceName: string,
    phone: string,
    message: string,
    maxRetries: number = RATE_LIMITS.maxRetries
): Promise<{ success: boolean; result?: any; error?: string; attempts: number }> {
    const remoteJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[ATTEMPT ${attempt}/${maxRetries}] Sending to ${phone}`);
            console.log(`[DEBUG] RemoteJid: ${remoteJid}`);
            console.log(`[DEBUG] API URL: ${EVOLUTION_API_URL}/message/sendText/${instanceName}`);

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

            console.log(`[DEBUG] Response status: ${response.status}`);

            let result;
            try {
                result = await response.json();
                console.log(`[DEBUG] Response body:`, JSON.stringify(result).substring(0, 200));
            } catch (e) {
                result = { error: "Could not parse response" };
                console.error(`[DEBUG] Failed to parse response:`, e);
            }

            if (response.ok && result.key) {
                return { success: true, result, attempts: attempt };
            }

            // Se não for último attempt, aguarda antes de retry
            if (attempt < maxRetries) {
                console.log(`[RETRY] Waiting ${RATE_LIMITS.retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.retryDelay));
            } else {
                return {
                    success: false,
                    error: JSON.stringify(result)?.substring(0, 500),
                    attempts: attempt
                };
            }
        } catch (error: any) {
            console.error(`[ATTEMPT ${attempt}/${maxRetries}] Exception:`, error.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.retryDelay));
            } else {
                return {
                    success: false,
                    error: error.message?.substring(0, 500),
                    attempts: attempt
                };
            }
        }
    }

    return { success: false, error: "Max retries reached", attempts: maxRetries };
}

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

    // Start processing in background (don't await - return immediately)
    processMessages(broadcastId, instanceName, message, recipients, salonId, supabase)
        .catch(error => {
            console.error(`[BROADCAST ${broadcastId}] Fatal error:`, error);
            // Update broadcast status to failed
            supabase.from("broadcasts").update({
                status: "failed",
                error_message: error.message
            }).eq("id", broadcastId);
        });

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
            const rawPhone = recipients[i];

            // Validar e formatar número
            const phone = formatPhoneNumber(rawPhone);

            if (!phone) {
                console.log(`[SKIPPING] Invalid phone format: ${rawPhone}`);
                failed++;
                await supabase.from("broadcast_messages").insert({
                    broadcast_id: broadcastId,
                    salon_id: salonId,
                    phone: rawPhone,
                    status: "failed",
                    error_message: "Formato de número inválido (use formato brasileiro com DDD)",
                });
                continue;
            }

            console.log(`[${i + 1}/${recipients.length}] SENDING: ${phone}`);

            // Enviar com retry automático
            const sendResult = await sendMessageWithRetry(instanceName, phone, message);

            const messageData = {
                broadcast_id: broadcastId,
                salon_id: salonId,
                phone: phone,
                status: sendResult.success ? "sent" : "failed",
                error_message: sendResult.success ? null : sendResult.error,
                whatsapp_message_id: sendResult.result?.key?.id || sendResult.result?.messageId || null,
            };

            await supabase.from("broadcast_messages").insert(messageData);

            if (sendResult.success) {
                sent++;
                consecutiveFailures = 0;
                console.log(`[SUCCESS] ${phone} (ID: ${sendResult.result.key.id}) - ${sendResult.attempts} attempt(s)`);
            } else {
                failed++;
                consecutiveFailures++;
                errors.push(`${phone}: ${sendResult.error}`);
                console.log(`[FAILED] ${phone} - ${sendResult.error} (${sendResult.attempts} attempts)`);

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
