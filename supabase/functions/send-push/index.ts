// Edge Function: send-push
// Envia push notifications para dispositivos dos clientes via Web Push API
// Chamada pela página de Marketing do Admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys (mesmas usadas no frontend)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
// Nota: A private key precisa ser gerada e armazenada nas env vars do Supabase
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    data?: Record<string, any>
}

// Web Push implementation usando fetch
async function sendWebPush(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: string,
    vapidDetails: { subject: string; publicKey: string; privateKey: string }
) {
    try {
        // Para uma implementação completa de Web Push, precisamos de uma biblioteca
        // Por enquanto, vamos usar uma abordagem simplificada com fetch

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'TTL': '86400',
            },
            body: payload,
        })

        return response.ok
    } catch (error) {
        console.error('Error sending push:', error)
        return false
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body: SendPushRequest = await req.json()

        if (!body.salon_id || !body.title || !body.body) {
            return new Response(
                JSON.stringify({ success: false, error: 'Parâmetros inválidos' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Buscar subscriptions dos clientes
        let query = supabase
            .from('push_subscriptions')
            .select('*')
            .eq('salon_id', body.salon_id)
            .eq('is_active', true)

        if (body.client_ids && body.client_ids.length > 0) {
            query = query.in('client_id', body.client_ids)
        }

        const { data: subscriptions, error: subError } = await query

        if (subError) {
            throw subError
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Nenhum dispositivo encontrado para envio',
                    sent: 0
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const payload = JSON.stringify({
            title: body.title,
            body: body.body,
            icon: body.icon || '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            data: body.data || {},
            timestamp: Date.now(),
        })

        const results: { endpoint: string; success: boolean; error?: string }[] = []

        for (const sub of subscriptions) {
            try {
                // Enviar push notification
                const response = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'TTL': '86400',
                        'Urgency': 'normal',
                    },
                    body: payload,
                })

                if (response.ok || response.status === 201) {
                    results.push({ endpoint: sub.endpoint, success: true })

                    // Registrar na tabela de notificações
                    await supabase.from('notifications').insert({
                        salon_id: body.salon_id,
                        client_id: sub.client_id,
                        type: 'push',
                        channel: 'push',
                        title: body.title,
                        message: body.body,
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                    })
                } else {
                    // Se endpoint retornou 410 (Gone), desativar subscription
                    if (response.status === 410) {
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id)
                    }

                    results.push({
                        endpoint: sub.endpoint,
                        success: false,
                        error: `HTTP ${response.status}`
                    })
                }
            } catch (err) {
                results.push({
                    endpoint: sub.endpoint,
                    success: false,
                    error: String(err)
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        return new Response(
            JSON.stringify({
                success: true,
                total: subscriptions.length,
                sent: successCount,
                failed: failCount,
                results,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('Erro geral:', error)

        return new Response(
            JSON.stringify({
                success: false,
                error: String(error)
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
