import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { campaignHandler } from "../_shared/whatsapp/campaign.ts";
// Endpoint legado não mantém executor alternativo: mesmas regras, confirmação e autorização.
serve(campaignHandler);
