// Supabase Edge Function: generate-text-content
// Gera ou melhora textos de marketing usando IA (Gemini, OpenAI, etc.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Endpoints
const AI_ENDPOINTS = {
    openai: "https://api.openai.com/v1/chat/completions",
    gemini: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    groq: "https://api.groq.com/openai/v1/chat/completions",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { text, instruction, salonId, provider: requestedProvider } = await req.json();

        if (!text && !instruction) {
            return new Response(
                JSON.stringify({ error: "Text or instruction is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Buscar chave do banco (se não especificado provider, buscar qualquer um ativo)
        let apiKey = "";
        let provider = requestedProvider || "gemini"; // Default to Gemini (free tier friendly)
        let model = "gemini-pro";

        // Tenta buscar chave específica do salão ou global
        // 1. Verificar configuração do salão (se houver tabela salon_ai_configs)
        let { data: salonConfig } = await supabase
            .from("salon_ai_configs")
            .select("provider, api_key:ai_provider_keys(api_key)")
            .eq("salon_id", salonId)
            .eq("is_active", true)
            .maybeSingle();

        if (salonConfig?.api_key?.api_key) {
            provider = salonConfig.provider;
            apiKey = salonConfig.api_key.api_key;
        } else {
            // 2. Tentar chave global do provedor solicitado ou fallback
            // Prioridade: Groq > OpenAI > Gemini
            const providersToCheck = requestedProvider ? [requestedProvider] : ["groq", "openai", "gemini"];

            for (const p of providersToCheck) {
                const { data: globalKey } = await supabase
                    .from("ai_provider_keys")
                    .select("api_key")
                    .ilike("provider", p)
                    .eq("is_active", true)
                    .maybeSingle();

                if (globalKey) {
                    provider = p;
                    apiKey = globalKey.api_key;
                    break;
                }
            }
        }

        // Fallback final para variável de ambiente (se não tiver no banco)
        if (!apiKey) {
            if (provider === "gemini") apiKey = Deno.env.get("GEMINI_API_KEY") || "";
            if (provider === "openai") apiKey = Deno.env.get("OPENAI_API_KEY") || "";
            if (provider === "groq") apiKey = Deno.env.get("GROQ_API_KEY") || "";
        }

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "No AI API key found" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Using AI provider: ${provider}`);

        let generatedText = "";
        const systemPrompt = `Você é um especialista em marketing digital para salões de beleza.
Seu objetivo é melhorar textos de mensagens para clientes (WhatsApp/SMS).
Aja como um copywriter persuasivo, use emojis adequados (mas não exagere), e mantenha o tom profissional e amigável.
O texto deve ser curto e direto, ideal para leitura rápida no celular.
Mantenha as variáveis como {nome} intactas.`;

        const userPrompt = instruction
            ? `${instruction}\n\nTexto original para base (opcional): "${text}"`
            : `Melhore este texto para ficar mais atraente: "${text}"`;

        if (provider === "gemini") {
            const response = await fetch(`${AI_ENDPOINTS.gemini}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt + "\n\n" + userPrompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    }
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Gemini API error");
            generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        } else if (provider === "openai" || provider === "groq") {
            const endpoint = provider === "openai" ? AI_ENDPOINTS.openai : AI_ENDPOINTS.groq;
            const modelName = provider === "openai" ? "gpt-4o-mini" : "llama3-70b-8192";

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `${provider} API error`);
            generatedText = data.choices?.[0]?.message?.content || "";
        }

        return new Response(
            JSON.stringify({
                success: true,
                text: generatedText.trim(),
                provider: provider
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("AI Generation Error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
