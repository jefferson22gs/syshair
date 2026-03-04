// =====================================================
// BROADCAST QUEUE WORKER
// Worker que processa a queue de mensagens continuamente
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

// Configurações
const BATCH_SIZE = 10; // Processar 10 mensagens por vez
const MESSAGE_INTERVAL = 3000; // 3 segundos entre mensagens

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log("🚀 Iniciando processamento da queue...");

        let processed = 0;
        let sent = 0;
        let failed = 0;

        // Processar até BATCH_SIZE mensagens
        for (let i = 0; i < BATCH_SIZE; i++) {
            const result = await processNextItem(supabase);

            if (!result.hasItem) {
                console.log("✅ Queue vazia, finalizando...");
                break;
            }

            processed++;
            if (result.success) {
                sent++;
            } else {
                failed++;
            }

            // Aguardar intervalo entre mensagens (exceto na última)
            if (i < BATCH_SIZE - 1) {
                await new Promise(resolve => setTimeout(resolve, MESSAGE_INTERVAL));
            }
        }

        // Verificar broadcasts para completar
        await supabase.rpc('check_broadcast_completion');

        console.log(`📊 Processamento concluído: ${processed} processadas, ${sent} enviadas, ${failed} falharam`);

        return new Response(
            JSON.stringify({
                success: true,
                processed,
                sent,
                failed,
                message: `Processadas ${processed} mensagens`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("❌ Erro no worker:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

/**
 * Processa próximo item da queue
 */
async function processNextItem(supabase: any): Promise<{ hasItem: boolean; success: boolean }> {
    // Buscar próximo item
    const { data: items, error: fetchError } = await supabase
        .rpc('process_next_broadcast_queue_item');

    if (fetchError) {
        console.error("Erro ao buscar item:", fetchError);
        return { hasItem: false, success: false };
    }

    if (!items || items.length === 0) {
        return { hasItem: false, success: false };
    }

    const item = items[0];
    console.log(`📤 Processando: ${item.recipient_phone}`);

    // Validar telefone
    const phone = formatPhoneNumber(item.recipient_phone);
    if (!phone) {
        console.log(`❌ Telefone inválido: ${item.recipient_phone}`);
        await supabase.rpc('mark_broadcast_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: 'Formato de telefone inválido'
        });
        return { hasItem: true, success: false };
    }

    // Verificar se tem instância configurada
    if (!item.instance_name) {
        console.log(`❌ Instância WhatsApp não configurada`);
        await supabase.rpc('mark_broadcast_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: 'Instância WhatsApp não configurada'
        });
        return { hasItem: true, success: false };
    }

    // Enviar mensagem
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

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            result = { error: responseText };
        }

        if (response.ok && result.key) {
            // Sucesso
            console.log(`✅ Enviado para ${phone}`);

            await supabase.rpc('mark_broadcast_queue_sent', {
                p_queue_id: item.queue_id,
                p_whatsapp_message_id: result.key.id
            });

            // Registrar em broadcast_messages
            await supabase.from("broadcast_messages").insert({
                broadcast_id: item.broadcast_id,
                salon_id: item.salon_id,
                phone: phone,
                status: "sent",
                whatsapp_message_id: result.key.id
            });

            return { hasItem: true, success: true };
        } else {
            throw new Error(JSON.stringify(result).substring(0, 200));
        }

    } catch (error: any) {
        console.error(`❌ Erro ao enviar para ${phone}:`, error.message);

        await supabase.rpc('mark_broadcast_queue_failed', {
            p_queue_id: item.queue_id,
            p_error_message: error.message.substring(0, 500)
        });

        return { hasItem: true, success: false };
    }
}

/**
 * Formata número de telefone
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
