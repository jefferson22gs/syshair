// =====================================================
// AUTO POST STATUS WHATSAPP
// Posta automaticamente link do salão nos status
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log("🤖 Processando auto-posts de status...");

        // Buscar salões que devem postar status
        const { data: salons, error } = await supabase
            .rpc('process_auto_status_posts');

        if (error) {
            throw new Error("Erro ao buscar salões: " + error.message);
        }

        if (!salons || salons.length === 0) {
            console.log("✅ Nenhum salão para postar status agora");
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Nenhum salão para postar",
                    processed: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📤 Processando ${salons.length} salões`);

        let posted = 0;
        let failed = 0;

        for (const salon of salons) {
            try {
                console.log(`📱 Postando status para ${salon.salon_name}...`);

                // Criar registro de histórico
                const { data: history, error: historyError } = await supabase
                    .from('status_post_history')
                    .insert({
                        salon_id: salon.salon_id,
                        message: salon.message,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (historyError) {
                    console.error("Erro ao criar histórico:", historyError);
                    continue;
                }

                // Postar status via Evolution API
                const response = await fetch(`${EVOLUTION_API_URL}/message/sendStatus/${salon.instance_name}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": EVOLUTION_API_KEY,
                    },
                    body: JSON.stringify({
                        type: "text",
                        content: salon.message,
                        backgroundColor: "#0d1117",
                        font: 1,
                        allContacts: true
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Evolution API error: ${errorText}`);
                }

                const result = await response.json();

                if (result.key) {
                    // Sucesso
                    await supabase
                        .from('status_post_history')
                        .update({
                            status: 'sent',
                            whatsapp_status_id: result.key.id,
                            posted_at: new Date().toISOString()
                        })
                        .eq('id', history.id);

                    // Marcar como postado
                    await supabase.rpc('mark_status_posted', {
                        p_salon_id: salon.salon_id
                    });

                    console.log(`✅ Status postado para ${salon.salon_name}`);
                    posted++;
                } else {
                    throw new Error("Resposta sem key");
                }

            } catch (error: any) {
                console.error(`❌ Erro ao postar para ${salon.salon_name}:`, error.message);

                // Atualizar histórico com erro
                await supabase
                    .from('status_post_history')
                    .update({
                        status: 'failed',
                        error_message: error.message.substring(0, 500)
                    })
                    .eq('salon_id', salon.salon_id)
                    .eq('status', 'pending');

                failed++;
            }

            // Aguardar 2 segundos entre posts
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`📊 Resultado: ${posted} postados, ${failed} falharam`);

        return new Response(
            JSON.stringify({
                success: true,
                processed: salons.length,
                posted,
                failed
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("❌ Erro:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
