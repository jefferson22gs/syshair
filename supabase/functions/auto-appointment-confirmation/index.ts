import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authorizeWorker,serviceClient,validUuid } from "../_shared/whatsapp/auth.ts";
import { corsHeaders,errorResponse,jsonResponse,readRequest,WhatsAppError } from "../_shared/whatsapp/errors.ts";
serve(async req=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
 try{
  authorizeWorker(req);
  const body=await readRequest(req);
  if(!validUuid(body.id)) throw new WhatsAppError("invalid_request");
  const {error}=await serviceClient().rpc("whatsapp_enqueue_confirmation",{p_appointment_id:body.id});
  if(error) throw new WhatsAppError("persistence_failed",503);
  return jsonResponse({success:true,queued:true});
 }catch(error){return errorResponse(error);}
});
