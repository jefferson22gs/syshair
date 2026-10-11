import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authorizeWorker, serviceClient } from "../_shared/whatsapp/auth.ts";
import { processOutboxItem } from "../_shared/whatsapp/outbox.ts";
import { corsHeaders,jsonResponse,errorResponse,WhatsAppError } from "../_shared/whatsapp/errors.ts";
serve(async req=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
 try{
  if(req.method!=="POST") throw new WhatsAppError("invalid_request",405);
  authorizeWorker(req);
  const db=serviceClient();
  const {data:reminders,error:re}=await db.rpc("whatsapp_enqueue_reminders");
  if(re) throw new WhatsAppError("persistence_failed",503);
  const {data:bridged,error:be}=await db.rpc("whatsapp_bridge_notifications");
  if(be) throw new WhatsAppError("persistence_failed",503);
  let processed=0;
  for(let i=0;i<10;i++){if(!await processOutboxItem(db))break;processed++;}
  // Push segue seu executor próprio. Nunca marcar push/WhatsApp enviado sem chamada real.
  return jsonResponse({reminders,bridged,processed});
 }catch(error){return errorResponse(error);}
});
