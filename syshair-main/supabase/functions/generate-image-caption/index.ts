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
        console.log("Starting generate-image-caption function...");

        const body = await req.json();
        const { imageUrl, imageBase64, context } = body;

        console.log("Received request:", {
            hasImageUrl: !!imageUrl,
            hasImageBase64: !!imageBase64,
            imageBase64Length: imageBase64?.length || 0,
            context
        });

        if (!imageUrl && !imageBase64) {
            return new Response(
                JSON.stringify({ error: "imageUrl or imageBase64 is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extrair base64 puro se vier com data URI
        let base64Data = imageBase64;
        let mimeType = "image/jpeg";

        if (imageBase64 && imageBase64.startsWith('data:')) {
            const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
                console.log("Extracted base64, mimeType:", mimeType, "dataLength:", base64Data.length);
            }
        }

        // Se temos URL em vez de base64, usar URL diretamente
        let imageContent;
        if (imageUrl && !imageBase64) {
            console.log("Using image URL:", imageUrl);
            // Gemini pode aceitar URLs públicas diretamente
            // Mas vamos baixar e converter para garantir
            try {
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                }
                const arrayBuffer = await imageResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                // Converter para base64
                let binary = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }
                base64Data = btoa(binary);

                const contentType = imageResponse.headers.get("content-type");
                if (contentType) {
                    mimeType = contentType.split(";")[0];
                }
                console.log("Downloaded image, size:", base64Data.length, "mimeType:", mimeType);
            } catch (fetchError) {
                console.error("Error fetching image:", fetchError);
                throw new Error("Não foi possível baixar a imagem");
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

        console.log("Calling Gemini API...");

        // Chamar Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
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

        console.log("Gemini response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API error:", errorText);
            throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log("Gemini response data:", JSON.stringify(data).substring(0, 500));

        const caption = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!caption) {
            console.error("No caption in response:", data);
            throw new Error("A IA não conseguiu gerar uma legenda para esta imagem");
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
                error: error.message || "Erro desconhecido"
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
