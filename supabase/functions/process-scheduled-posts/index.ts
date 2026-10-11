import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authorizeWorker, serviceClient } from "../_shared/whatsapp/auth.ts";
import { corsHeaders, errorResponse, jsonResponse, WhatsAppError } from "../_shared/whatsapp/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") throw new WhatsAppError("invalid_request", 405);
    authorizeWorker(req);
    const { data, error } = await serviceClient().rpc("whatsapp_enqueue_due_status");
    if (error) throw new WhatsAppError("persistence_failed", 503);
    // Cron envia para outbox; somente dispatch chama Evolution, usando gate global por instância.
    return jsonResponse({ queued: data });
  } catch (error) { return errorResponse(error); }
});
