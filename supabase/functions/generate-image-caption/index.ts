import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authorizeSalon, requiredEnv, serviceClient } from "../_shared/whatsapp/auth.ts";
import { corsHeaders, errorResponse, jsonResponse, readRequest, WhatsAppError, objectValue } from "../_shared/whatsapp/errors.ts";

serve(async(req) => {
  if(req.method === "OPTIONS") return new Response(null,{headers:corsHeaders});
  try {
    const body=await readRequest(req);
    await authorizeSalon(req,serviceClient(),body.salonId);
    // Sem fetch de URL fornecida pelo usuário: evita SSRF e download sem limite.
    if(typeof body.imageBase64!=="string" || body.imageBase64.length>400_000) throw new WhatsAppError("invalid_request");
    const image=body.imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if(!image) throw new WhatsAppError("invalid_request");
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requiredEnv("GEMINI_CAPTION_MODEL"))}:generateContent`,{
      method:"POST",redirect:"error",signal:AbortSignal.timeout(20_000),
      headers:{"Content-Type":"application/json","x-goog-api-key":requiredEnv("GEMINI_API_KEY")},
      body:JSON.stringify({contents:[{parts:[{text:"Escreva uma legenda curta em português brasileiro para esta imagem do salão. Não invente preços nem promoções. Máximo 150 caracteres."},{inline_data:{mime_type:image[1],data:image[2]}}]}],generationConfig:{temperature:0.5,maxOutputTokens:150}}),
    });
    if(!response.ok) throw new WhatsAppError("provider_unavailable",502);
    const result=objectValue(await response.json());
    const candidates=result.candidates as {content?:{parts?:{text?:string}[]}}[] | undefined;
    const caption=candidates?.[0]?.content?.parts?.[0]?.text?.trim().slice(0,300);
    if(!caption) throw new WhatsAppError("provider_unavailable",502);
    return jsonResponse({success:true,caption});
  }catch(error){return errorResponse(error);}
});
