// Supabase Edge Function: generate-image-caption
// Usa Google Gemini Vision para gerar legendas automáticas para imagens

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini API Key
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyCnkj3bq6Tn7Nlxmw67AtIxNNHTlB9PPPI";

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { imageUrl, imageBase64, context } = await req.json();

        if (!imageUrl && !imageBase64) {
            return new Response(
                JSON.stringify({ error: "imageUrl or imageBase64 is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Se temos URL, precisamos baixar a imagem e converter para base64
        let base64Data = imageBase64;
        let mimeType = "image/jpeg";

        if (imageUrl && !imageBase64) {
            try {
                const imageResponse = await fetch(imageUrl);
                const arrayBuffer = await imageResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                base64Data = btoa(String.fromCharCode(...uint8Array));

                // Detectar mime type
                const contentType = imageResponse.headers.get("content-type");
                if (contentType) {
                    mimeType = contentType.split(";")[0];
                }
            } catch (fetchError) {
                console.error("Error fetching image:", fetchError);
                throw new Error("Não foi possível baixar a imagem");
            }
        } else if (imageBase64) {
            // Extrair base64 puro se vier com data URI
            if (imageBase64.startsWith('data:')) {
                const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    mimeType = matches[1];
                    base64Data = matches[2];
                }
            }
        }

        // Prompt especializado para salão de beleza
        const prompt = `Você é um especialista em marketing para salões de beleza e barbearias brasileiros.

Analise esta imagem e crie uma legenda criativa e envolvente para postar no Status do WhatsApp.

Diretrizes:
- Seja breve e impactante (máximo 2 linhas)
- Use 2-4 emojis relevantes (💇‍♀️✨💅💈)
- Destaque a transformação ou resultado visível
- Inclua uma chamada para ação sutil
- Tom inspirador e positivo
- Máximo 150 caracteres

Contexto: ${context || 'Salão de beleza/barbearia'}

Retorne APENAS a legenda, sem explicações, aspas ou formatação adicional.`;

        // Chamar Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 200,
                    }
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("Gemini API error:", error);
            throw new Error(error.error?.message || "Failed to generate caption");
        }

        const data = await response.json();
        const caption = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!caption) {
            throw new Error("No caption generated");
        }

        console.log("Generated caption:", caption);

        return new Response(
            JSON.stringify({
                success: true,
                caption: caption,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
