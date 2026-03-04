// =====================================================
// BROADCAST MESSAGES V2 - Sistema com Queue
// Corrige problema de timeout usando processamento assíncrono
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
    action: 'create_broadcast' | 'process_queue' | 'get_status' | 'stop_broadcast';
    salonId?: string;
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
        const { action } = body;

        switch (action) {
            case 'create_broadcast':
                return await createBroadcast(body, supabase);

            case 'process_queue':
                return await processQueue(supabase);

            case 'get_status':
                return await getBroadcastStatus(body.broadcastId!, supabase);

            case 'stop_broadcast':
                return await stopBroadcast(body.broadcastId!, supabase);

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error: any) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

/**
 * Cria broadcast e adiciona mensagens na queue
 */
async function createBroadcast(request: BroadcastRequest, supabase: any) {
    const { salonId, message, recipients } = request;

    if (!salonId || !message || !recipients || recipients.length === 0) {
        return new Response(
            JSON.stringify({ error: "salonId, message e recipients são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Verificar limite diário
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStats } = await supabase
        .from("broadcast_messages")
        .select("id")
        .eq("salon_id", salonId)
        .gte("created_at", `${today}T00:00:00`)
        .eq("status", "sent");

    const sentToday = todayStats?.length || 0;
    const dailyLimit = 5000;

    if (sentToday + recipients.length > dailyLimit) {
        return new Response(
            JSON.stringify({
                error: `Limite diário atingido. Enviado hoje: ${sentToday}/${dailyLimit}`,
                remaining: dailyLimit - sentToday
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Criar broadcast
    const { data: broadcast, error: broadcastError } = await supabase
        .from("broadcasts")
        .insert({
            salon_id: salonId,
            message: message,
            total_recipients: recipients.length,
            status: "processing",
            progress_percent: 0,
            sent_count: 0,
            failed_count: 0
        })
        .select()
        .single();

    if (broadcastError) {
        throw new Error("Falha ao criar broadcast: " + broadcastError.message);
    }

    // Adicionar todos os destinatários na queue
    const queueItems = recipients.map(phone => ({
        broadcast_id: broadcast.id,
        salon_id: salonId,
        recipient_phone: phone,
        message: message,
        status: 'pending'
    }));

    const { error: queueError } = await supabase
        .from("broadcast_queue")
        .insert(queueItems);

    if (queueError) {
        // Rollback: deletar broadcast se falhar ao criar queue
        await supabase.from("broadcasts").delete().eq("id", broadcast.id);
        throw new Error("Falha ao criar queue: " + queueError.message);
    }

    console.log(`✅ Broadcast ${broadcast.id} criado com ${recipients.length} mensagens na queue`);

    return new Response(
        JSON.stringify({
            success: true,
            broadcastId: broadcast.id,
            message: `Disparo criado! ${recipients.length} mensagens serão enviadas em segundo plano.`,
            totalRecipients: recipients.length,
            estimatedTime: `${Math.ceil(recipients.length * 5 / 60)} minutos`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

/**
 * Processa próximo item da queue
 * Esta função deve ser chamada por um cron job ou worker
 */
async function processQueue(supabase: any) {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

    // Buscar próximo item da queue
    const { data: items, error: fetchError } = await supabase
        .rpc('process_next_broadcast_queue_item');

    if (fetchError) {
        console.error("Erro ao buscar item da queue:", fetchError);
        return new Response(
            JSON.stringify({ error: fetchError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!items || items.length === 0) {
        // Verificar se há broadcasts para completar
        await supabase.rpc('check_broadcast_completion');

        return new Response(
            JSON.stringify({ message: "Nenhum item na queue", processed: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const item = items[0];
    console.log(`📤 Processando queue item ${item.queue_id} para ${item.recipient_phone}`);

    // Formatar telefone
    const phone = formatPhoneNumber(item.recipient_phone);
    if (!phone) {
        await supabase.rpc('mark_broadcast_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: 'Formato de telefone inválido'
        });

        return new Response(
            JSON.stringify({ success: false, error: "Telefone inválido" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Enviar via Evolution API
    try {
        const remoteJid = `${phone}@s.whatsapp.net`;

        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${item.instance_name}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
                number: remoteJid,
                text: item.message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Evolution API error: ${errorText}`);
        }

        const result = await response.json();

        if (result.key) {
            // Sucesso
            await supabase.rpc('mark_broadcast_queue_sent', {
                p_queue_id: item.queue_id,
                p_whatsapp_message_id: result.key.id
            });

            // Registrar em broadcast_messages para histórico
            await supabase.from("broadcast_messages").insert({
                broadcast_id: item.broadcast_id,
                salon_id: item.salon_id,
                phone: phone,
                status: "sent",
                whatsapp_message_id: result.key.id
            });

            console.log(`✅ Mensagem enviada com sucesso para ${phone}`);

            return new Response(
                JSON.stringify({ success: true, phone, messageId: result.key.id }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        } else {
            throw new Error("Resposta da API sem key");
        }

    } catch (error: any) {
        console.error(`❌ Erro ao enviar para ${phone}:`, error.message);

        await supabase.rpc('mark_broadcast_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: error.message.substring(0, 500)
        });

        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
}

/**
 * Busca status de um broadcast
 */
async function getBroadcastStatus(broadcastId: string, supabase: any) {
    const { data: stats } = await supabase
        .from("broadcast_stats")
        .select("*")
        .eq("id", broadcastId)
        .single();

    if (!stats) {
        return new Response(
            JSON.stringify({ error: "Broadcast não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
        JSON.stringify({ success: true, stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

/**
 * Para um broadcast em andamento
 */
async function stopBroadcast(broadcastId: string, supabase: any) {
    // Deletar itens pendentes da queue
    await supabase
        .from("broadcast_queue")
        .delete()
        .eq("broadcast_id", broadcastId)
        .eq("status", "pending");

    // Atualizar status do broadcast
    await supabase
        .from("broadcasts")
        .update({
            status: "stopped",
            completed_at: new Date().toISOString()
        })
        .eq("id", broadcastId);

    return new Response(
        JSON.stringify({ success: true, message: "Broadcast interrompido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
