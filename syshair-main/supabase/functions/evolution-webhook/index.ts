// Supabase Edge Function: evolution-webhook
// Recebe webhooks da Evolution API e processa mensagens com IA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações dos provedores de IA
const AI_ENDPOINTS = {
    openai: "https://api.openai.com/v1/chat/completions",
    gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    grok: "https://api.x.ai/v1/chat/completions",
    perplexity: "https://api.perplexity.ai/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
};

// Evolution API Config
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

interface WebhookPayload {
    event: string;
    instance: string;
    data: {
        key: {
            remoteJid: string;
            fromMe: boolean;
            id: string;
        };
        pushName?: string;
        message?: {
            conversation?: string;
            extendedTextMessage?: {
                text: string;
            };
        };
        messageType?: string;
        messageTimestamp?: number;
    };
}

interface ChatbotSettings {
    id: string;
    salon_id: string;
    enabled: boolean;
    ai_provider: string;
    ai_model: string;
    api_key: string;
    bot_name: string;
    welcome_message: string;
    system_prompt: string;
    custom_instructions: string;
    temperature: number;
    max_tokens: number;
    response_delay_ms: number;
    active_hours_start: string;
    active_hours_end: string;
    active_days: number[];
    out_of_hours_message: string;
    fallback_message: string;
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

        const payload: WebhookPayload = await req.json();
        console.log("Webhook received:", JSON.stringify(payload, null, 2));

        // Só processar mensagens recebidas
        if (payload.event !== "messages.upsert" || !payload.data) {
            return new Response(JSON.stringify({ status: "ignored", reason: "not a message event" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Ignorar mensagens enviadas por nós
        if (payload.data.key?.fromMe) {
            return new Response(JSON.stringify({ status: "ignored", reason: "own message" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const instanceName = payload.instance;
        const remoteJid = payload.data.key?.remoteJid;

        // IMPORTANTE: Ignorar mensagens de grupos (grupos têm @g.us, conversas individuais têm @s.whatsapp.net)
        if (remoteJid?.includes("@g.us")) {
            console.log("Ignoring group message from:", remoteJid);
            return new Response(JSON.stringify({ status: "ignored", reason: "group message" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const messageContent = payload.data.message?.conversation ||
            payload.data.message?.extendedTextMessage?.text || "";
        const senderName = payload.data.pushName || "Cliente";
        const messageId = payload.data.key?.id;

        // Extrair número de telefone
        const phoneNumber = remoteJid?.split("@")[0];

        if (!messageContent || !phoneNumber) {
            return new Response(JSON.stringify({ status: "ignored", reason: "empty message or no phone" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Message from ${phoneNumber} (${senderName}): ${messageContent}`);

        // Buscar instância e configurações do chatbot
        const { data: instance } = await supabase
            .from("whatsapp_instances")
            .select("salon_id")
            .eq("instance_name", instanceName)
            .single();

        if (!instance) {
            console.error("Instance not found:", instanceName);
            return new Response(JSON.stringify({ status: "error", reason: "instance not found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const salonId = instance.salon_id;

        // Salvar mensagem recebida no histórico
        await supabase.from("chatbot_conversations").insert({
            salon_id: salonId,
            client_phone: phoneNumber,
            client_name: senderName,
            direction: "incoming",
            content: messageContent,
            whatsapp_message_id: messageId,
        });

        // Buscar configurações do chatbot
        const { data: settings } = await supabase
            .from("chatbot_settings")
            .select("*")
            .eq("salon_id", salonId)
            .single();

        if (!settings || !settings.enabled) {
            console.log("Chatbot disabled for salon:", salonId);
            return new Response(JSON.stringify({ status: "ok", reason: "chatbot disabled" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const chatbotSettings = settings as ChatbotSettings;

        // Se não tiver API Key específica do salão, buscar a chave global do Super Admin
        if (!chatbotSettings.api_key) {
            console.log("No salon API Key found, checking global keys for:", chatbotSettings.ai_provider);
            const { data: globalKey } = await supabase
                .from("ai_provider_keys")
                .select("api_key")
                .ilike("provider", chatbotSettings.ai_provider)
                .eq("is_active", true)
                .maybeSingle();

            if (globalKey) {
                chatbotSettings.api_key = globalKey.api_key;
                console.log("Using global API key for provider:", chatbotSettings.ai_provider);
            } else {
                console.warn("No global API key found for provider:", chatbotSettings.ai_provider);
            }
        }

        // Verificar horário de funcionamento
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

        const isActiveDay = chatbotSettings.active_days.includes(currentDay);
        const isActiveHour = currentTime >= chatbotSettings.active_hours_start &&
            currentTime <= chatbotSettings.active_hours_end;

        if (!isActiveDay || !isActiveHour) {
            // Fora do horário - enviar mensagem automática
            await sendWhatsAppMessage(
                instanceName,
                remoteJid,
                chatbotSettings.out_of_hours_message
            );

            await supabase.from("chatbot_conversations").insert({
                salon_id: salonId,
                client_phone: phoneNumber,
                direction: "outgoing",
                content: chatbotSettings.out_of_hours_message,
                ai_response: false,
            });

            return new Response(JSON.stringify({ status: "ok", action: "out_of_hours_message_sent" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Buscar histórico de conversa recente para contexto
        const { data: recentMessages } = await supabase
            .from("chatbot_conversations")
            .select("direction, content")
            .eq("salon_id", salonId)
            .eq("client_phone", phoneNumber)
            .order("created_at", { ascending: false })
            .limit(10);

        // Buscar base de conhecimento
        const { data: knowledgeBase } = await supabase
            .from("chatbot_knowledge_base")
            .select("question, answer")
            .eq("salon_id", salonId)
            .eq("enabled", true);

        // Buscar informações do salão
        const { data: salon } = await supabase
            .from("salons")
            .select("name, phone, address, opening_time, closing_time")
            .eq("id", salonId)
            .single();

        // Buscar serviços do salão
        const { data: services } = await supabase
            .from("services")
            .select("name, price, duration")
            .eq("salon_id", salonId)
            .eq("active", true);

        // Montar contexto para a IA
        const salonContext = salon ? `
Informações do Salão:
- Nome: ${salon.name}
- Telefone: ${salon.phone || "Não informado"}
- Endereço: ${salon.address || "Não informado"}
- Horário: ${salon.opening_time || "09:00"} às ${salon.closing_time || "18:00"}

Serviços disponíveis:
${services?.map(s => `- ${s.name}: R$ ${s.price?.toFixed(2)} (${s.duration} min)`).join("\n") || "Nenhum serviço cadastrado"}
` : "";

        const knowledgeContext = knowledgeBase?.length ? `
Perguntas frequentes:
${knowledgeBase.map(k => `P: ${k.question}\nR: ${k.answer}`).join("\n\n")}
` : "";

        // Formatar histórico de conversa
        const conversationHistory = recentMessages?.reverse().map(m => ({
            role: m.direction === "incoming" ? "user" : "assistant",
            content: m.content,
        })) || [];

        // Adicionar delay para parecer mais humano
        if (chatbotSettings.response_delay_ms > 0) {
            await new Promise(resolve => setTimeout(resolve, chatbotSettings.response_delay_ms));
        }

        // Gerar resposta da IA
        const startTime = Date.now();
        const aiResponse = await generateAIResponse(
            chatbotSettings,
            messageContent,
            conversationHistory,
            salonContext + knowledgeContext + (chatbotSettings.custom_instructions || "")
        );
        const responseTime = Date.now() - startTime;

        if (!aiResponse.success) {
            // Enviar mensagem de fallback
            await sendWhatsAppMessage(instanceName, remoteJid, chatbotSettings.fallback_message);

            await supabase.from("chatbot_conversations").insert({
                salon_id: salonId,
                client_phone: phoneNumber,
                direction: "outgoing",
                content: chatbotSettings.fallback_message,
                ai_response: false,
                error_message: aiResponse.error,
            });

            return new Response(JSON.stringify({ status: "error", error: aiResponse.error }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Enviar resposta via WhatsApp
        await sendWhatsAppMessage(instanceName, remoteJid, aiResponse.message);

        // Salvar resposta no histórico
        await supabase.from("chatbot_conversations").insert({
            salon_id: salonId,
            client_phone: phoneNumber,
            direction: "outgoing",
            content: aiResponse.message,
            ai_response: true,
            ai_provider: chatbotSettings.ai_provider,
            ai_model: chatbotSettings.ai_model,
            tokens_used: aiResponse.tokens,
            response_time_ms: responseTime,
        });

        return new Response(JSON.stringify({
            status: "ok",
            action: "ai_response_sent",
            response_time_ms: responseTime,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Webhook error:", error);
        return new Response(JSON.stringify({ status: "error", error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

async function generateAIResponse(
    settings: ChatbotSettings,
    userMessage: string,
    conversationHistory: { role: string; content: string }[],
    additionalContext: string
): Promise<{ success: boolean; message?: string; tokens?: number; error?: string }> {
    try {
        const systemPrompt = `${settings.system_prompt}

${additionalContext}

Seu nome é ${settings.bot_name}. Responda sempre em português brasileiro de forma educada e profissional.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: userMessage },
        ];

        let response: Response;
        let responseData: any;

        switch (settings.ai_provider) {
            case "openai":
                response = await fetch(AI_ENDPOINTS.openai, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${settings.api_key}`,
                    },
                    body: JSON.stringify({
                        model: settings.ai_model,
                        messages,
                        temperature: settings.temperature,
                        max_tokens: settings.max_tokens,
                    }),
                });
                responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "OpenAI API error");
                }

                return {
                    success: true,
                    message: responseData.choices[0]?.message?.content || "",
                    tokens: responseData.usage?.total_tokens,
                };

            case "gemini":
                const geminiUrl = `${AI_ENDPOINTS.gemini}/${settings.ai_model}:generateContent?key=${settings.api_key}`;
                response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            { role: "user", parts: [{ text: systemPrompt }] },
                            ...conversationHistory.map(m => ({
                                role: m.role === "assistant" ? "model" : "user",
                                parts: [{ text: m.content }],
                            })),
                            { role: "user", parts: [{ text: userMessage }] },
                        ],
                        generationConfig: {
                            temperature: settings.temperature,
                            maxOutputTokens: settings.max_tokens,
                        },
                    }),
                });
                responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "Gemini API error");
                }

                return {
                    success: true,
                    message: responseData.candidates?.[0]?.content?.parts?.[0]?.text || "",
                    tokens: responseData.usageMetadata?.totalTokenCount,
                };

            case "grok":
                response = await fetch(AI_ENDPOINTS.grok, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${settings.api_key}`,
                    },
                    body: JSON.stringify({
                        model: settings.ai_model,
                        messages,
                        temperature: settings.temperature,
                        max_tokens: settings.max_tokens,
                    }),
                });
                responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "Grok API error");
                }

                return {
                    success: true,
                    message: responseData.choices[0]?.message?.content || "",
                    tokens: responseData.usage?.total_tokens,
                };

            case "perplexity":
                response = await fetch(AI_ENDPOINTS.perplexity, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${settings.api_key}`,
                    },
                    body: JSON.stringify({
                        model: settings.ai_model,
                        messages,
                        temperature: settings.temperature,
                        max_tokens: settings.max_tokens,
                    }),
                });
                responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "Perplexity API error");
                }

                return {
                    success: true,
                    message: responseData.choices[0]?.message?.content || "",
                    tokens: responseData.usage?.total_tokens,
                };

            case "groq":
                response = await fetch(AI_ENDPOINTS.groq, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${settings.api_key}`,
                    },
                    body: JSON.stringify({
                        model: settings.ai_model,
                        messages,
                        temperature: settings.temperature,
                        max_tokens: settings.max_tokens,
                    }),
                });
                responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error?.message || "Groq API error");
                }

                return {
                    success: true,
                    message: responseData.choices[0]?.message?.content || "",
                    tokens: responseData.usage?.total_tokens,
                };

            default:
                throw new Error(`Unsupported AI provider: ${settings.ai_provider}`);
        }
    } catch (error) {
        console.error("AI generation error:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

async function sendWhatsAppMessage(
    instanceName: string,
    remoteJid: string,
    message: string
): Promise<void> {
    try {
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
            const error = await response.json();
            throw new Error(error.message || "Failed to send WhatsApp message");
        }

        console.log(`Message sent to ${remoteJid}`);
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
}
