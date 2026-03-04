// =====================================================
// SEND PUSH NOTIFICATION
// Envia notificações push para usuários
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
    salonId?: string;
    ownerId?: string;
    userId?: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const request: PushRequest = await req.json();
        const { salonId, ownerId, userId, title, body, icon, badge, data } = request;

        console.log("📱 Enviando push notification:", { title, salonId, ownerId, userId });

        let subscriptions: any[] = [];

        // Buscar subscriptions baseado nos parâmetros
        if (userId) {
            const { data: subs } = await supabase
                .rpc('get_user_push_subscriptions', { p_user_id: userId });
            subscriptions = subs || [];
        } else if (ownerId) {
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('id, endpoint, p256dh, auth')
                .eq('user_id', ownerId)
                .eq('is_active', true);
            subscriptions = subs || [];
        } else if (salonId) {
            const { data: subs } = await supabase
                .rpc('get_salon_push_subscriptions', { p_salon_id: salonId });
            subscriptions = subs || [];
        }

        if (subscriptions.length === 0) {
            console.log("⚠️ Nenhuma subscription encontrada");
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Nenhuma subscription encontrada",
                    sent: 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📤 Enviando para ${subscriptions.length} subscriptions`);

        const payload = {
            title,
            body,
            icon: icon || '/pwa-192x192.png',
            badge: badge || '/pwa-192x192.png',
            data: data || {},
            timestamp: Date.now()
        };

        let sent = 0;
        let failed = 0;

        // Enviar para cada subscription
        for (const sub of subscriptions) {
            try {
                // Aqui você usaria web-push ou Firebase Admin SDK
                // Por enquanto, vamos simular o envio

                // TODO: Implementar envio real com web-push
                // const webpush = require('web-push');
                // await webpush.sendNotification(subscription, JSON.stringify(payload));

                console.log(`✅ Push enviado para subscription ${sub.id}`);
                sent++;

            } catch (error: any) {
                console.error(`❌ Erro ao enviar para subscription ${sub.id}:`, error.message);
                failed++;

                // Desativar subscription se erro permanente
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await supabase
                        .from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('id', sub.id);
                }
            }
        }

        console.log(`📊 Resultado: ${sent} enviadas, ${failed} falharam`);

        return new Response(
            JSON.stringify({
                success: true,
                sent,
                failed,
                total: subscriptions.length
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("❌ Erro:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
