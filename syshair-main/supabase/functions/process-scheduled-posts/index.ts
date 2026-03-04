// Supabase Edge Function: process-scheduled-posts
// Processa e publica posts agendados no Status do WhatsApp

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Evolution API Config
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

interface ScheduledPost {
    id: string;
    salon_id: string;
    content_type: 'text' | 'image' | 'video';
    text_content: string | null;
    media_url: string | null;
    scheduled_at: string;
    recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly';
    recurrence_days: number[] | null;
    recurrence_end_date: string | null;
    status: string;
}

interface WhatsAppInstance {
    instance_name: string;
    status: string;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log("Processing scheduled posts...");

        // Buscar posts agendados que precisam ser publicados
        const now = new Date().toISOString();
        const { data: pendingPosts, error: postsError } = await supabase
            .from("scheduled_posts")
            .select(`
                id,
                salon_id,
                content_type,
                text_content,
                media_url,
                scheduled_at,
                recurrence_type,
                recurrence_days,
                recurrence_end_date,
                status
            `)
            .eq("status", "scheduled")
            .lte("scheduled_at", now);

        if (postsError) {
            throw new Error(`Error fetching posts: ${postsError.message}`);
        }

        if (!pendingPosts || pendingPosts.length === 0) {
            console.log("No pending posts to process");
            return new Response(JSON.stringify({
                status: "ok",
                message: "No pending posts",
                processed: 0
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${pendingPosts.length} posts to process`);

        const results = {
            processed: 0,
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const post of pendingPosts as ScheduledPost[]) {
            try {
                // Marcar como processando
                await supabase
                    .from("scheduled_posts")
                    .update({ status: "processing" })
                    .eq("id", post.id);

                // Buscar instância do WhatsApp do salão
                const { data: instance } = await supabase
                    .from("whatsapp_instances")
                    .select("instance_name, status")
                    .eq("salon_id", post.salon_id)
                    .single();

                if (!instance || instance.status !== "connected") {
                    throw new Error("WhatsApp instance not connected");
                }

                const whatsappInstance = instance as WhatsAppInstance;

                // Publicar no Status do WhatsApp
                let statusId: string | undefined;

                if (post.content_type === "text" && post.text_content) {
                    // Enviar status de texto
                    statusId = await sendTextStatus(
                        whatsappInstance.instance_name,
                        post.text_content
                    );
                } else if ((post.content_type === "image" || post.content_type === "video") && post.media_url) {
                    // Enviar status de mídia
                    statusId = await sendMediaStatus(
                        whatsappInstance.instance_name,
                        post.media_url,
                        post.content_type,
                        post.text_content || undefined
                    );
                } else {
                    throw new Error("Invalid post content");
                }

                // Marcar como publicado
                await supabase
                    .from("scheduled_posts")
                    .update({
                        status: "posted",
                        posted_at: new Date().toISOString(),
                        whatsapp_status_id: statusId,
                    })
                    .eq("id", post.id);

                // Se for recorrente, criar próximo agendamento
                if (post.recurrence_type !== "once") {
                    await createNextRecurrence(supabase, post);
                }

                results.success++;
                console.log(`Post ${post.id} published successfully`);

            } catch (postError: any) {
                console.error(`Error processing post ${post.id}:`, postError);

                // Marcar como falhou
                await supabase
                    .from("scheduled_posts")
                    .update({
                        status: "failed",
                        error_message: postError.message,
                    })
                    .eq("id", post.id);

                results.failed++;
                results.errors.push(`Post ${post.id}: ${postError.message}`);
            }

            results.processed++;
        }

        console.log("Processing complete:", results);

        return new Response(JSON.stringify({
            status: "ok",
            ...results,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({
            status: "error",
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

async function sendTextStatus(
    instanceName: string,
    text: string
): Promise<string | undefined> {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendStatus/${instanceName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
            type: "text",
            content: text,
            backgroundColor: "#1a1a1a",
            font: 1,
            allContacts: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send text status");
    }

    const data = await response.json();
    return data.key?.id;
}

async function sendMediaStatus(
    instanceName: string,
    mediaUrl: string,
    mediaType: "image" | "video",
    caption?: string
): Promise<string | undefined> {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendStatus/${instanceName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
            type: mediaType,
            content: mediaUrl,
            caption: caption || "",
            allContacts: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to send ${mediaType} status`);
    }

    const data = await response.json();
    return data.key?.id;
}

async function createNextRecurrence(
    supabase: any,
    originalPost: ScheduledPost
): Promise<void> {
    const scheduledDate = new Date(originalPost.scheduled_at);
    let nextDate: Date | null = null;

    switch (originalPost.recurrence_type) {
        case "daily":
            nextDate = new Date(scheduledDate);
            nextDate.setDate(nextDate.getDate() + 1);
            break;

        case "weekly":
            // Encontrar próximo dia da semana configurado
            if (originalPost.recurrence_days && originalPost.recurrence_days.length > 0) {
                const currentDay = scheduledDate.getDay();
                const sortedDays = [...originalPost.recurrence_days].sort((a, b) => a - b);

                // Encontrar próximo dia após o atual
                let nextDay = sortedDays.find(d => d > currentDay);
                let daysToAdd: number;

                if (nextDay !== undefined) {
                    daysToAdd = nextDay - currentDay;
                } else {
                    // Próxima semana, primeiro dia configurado
                    daysToAdd = 7 - currentDay + sortedDays[0];
                }

                nextDate = new Date(scheduledDate);
                nextDate.setDate(nextDate.getDate() + daysToAdd);
            } else {
                // Se não tem dias configurados, adiciona 7 dias
                nextDate = new Date(scheduledDate);
                nextDate.setDate(nextDate.getDate() + 7);
            }
            break;

        case "monthly":
            nextDate = new Date(scheduledDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;

        default:
            return; // Não é recorrente
    }

    // Verificar se a próxima data está dentro do período de recorrência
    if (originalPost.recurrence_end_date) {
        const endDate = new Date(originalPost.recurrence_end_date);
        if (nextDate > endDate) {
            console.log(`Recurrence ended for post ${originalPost.id}`);
            return;
        }
    }

    // Criar novo post agendado
    await supabase.from("scheduled_posts").insert({
        salon_id: originalPost.salon_id,
        content_type: originalPost.content_type,
        text_content: originalPost.text_content,
        media_url: originalPost.media_url,
        scheduled_at: nextDate.toISOString(),
        recurrence_type: originalPost.recurrence_type,
        recurrence_days: originalPost.recurrence_days,
        recurrence_end_date: originalPost.recurrence_end_date,
        status: "scheduled",
    });

    console.log(`Created next recurrence for post ${originalPost.id} at ${nextDate.toISOString()}`);
}
