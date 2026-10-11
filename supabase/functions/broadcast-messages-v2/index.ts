import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { campaignHandler } from "../_shared/whatsapp/campaign.ts";
serve(campaignHandler);
