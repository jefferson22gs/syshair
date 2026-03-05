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

        // Buscar postagens pendentes
        const { data: pendingPosts, error: postsError } = await supabase
            .from('whatsapp_status_posts')
            .select(`
                id,
                salon_id,
                status_text,
                status_image_url,
                salons!inner(
                    name,
                    slug,
                    whatsapp_instances!inner(
                        instance_name,
                        status
                    )
                )
            `)
            .eq('success', false)
            .is('error_message', null)
            .limit(10);

        if (postsError) {
            throw new Error("Erro ao buscar posts pendentes: " + postsError.message);
        }

        if (!pendingPosts || pendingPosts.length === 0) {
            console.log("✅ Nenhuma postagem pendente");
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Nenhuma postagem pendente",
                    processed: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📤 Processando ${pendingPosts.length} postagens`);

        let posted = 0;
        let failed = 0;

        for (const post of pendingPosts) {
            try {
                const salon = post.salons;
                const instance = salon.whatsapp_instances[0];

                if (!instance || instance.status !== 'connected') {
                    throw new Error("WhatsApp não conectado");
                }

                console.log(`📱 Postando status para ${salon.name}...`);

                // Postar status via Evolution API
                const response = await fetch(`${EVOLUTION_API_URL}/message/sendStatus/${instance.instance_name}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": EVOLUTION_API_KEY,
                    },
                    body: JSON.stringify({
                        type: "text",
                        content: post.status_text,
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

                // Atualizar como sucesso
                await supabase
                    .from('whatsapp_status_posts')
                    .update({
                        success: true,
                        posted_at: new Date().toISOString()
                    })
                    .eq('id', post.id);

                console.log(`✅ Status postado para ${salon.name}`);
                posted++;

            } catch (error: any) {
                console.error(`❌ Erro ao postar:`, error.message);

                // Atualizar com erro
                await supabase
                    .from('whatsapp_status_posts')
                    .update({
                        error_message: error.message.substring(0, 500)
                    })
                    .eq('id', post.id);

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
