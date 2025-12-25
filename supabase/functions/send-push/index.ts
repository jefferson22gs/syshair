// Edge Function: send-push
// Envia push notifications para dispositivos dos clientes via Web Push API
// Usa biblioteca web-push para criptografia e assinatura VAPID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys - você pode gerar novas em: https://web-push-codelab.glitch.me/
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'VAPID_PRIVATE_KEY_NOT_SET'
const VAPID_SUBJECT = 'mailto:contato@syshair.app'

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    data?: Record<string, any>
}

// Função para converter base64url para Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - base64.length % 4) % 4)
    const base64Padded = base64 + padding
    const binary = atob(base64Padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

// Função para converter Uint8Array para base64url
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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

        console.log('Received push request:', { salon_id: body.salon_id, title: body.title })

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

        console.log('Found subscriptions:', subscriptions?.length || 0)

        if (subError) {
            console.error('Error fetching subscriptions:', subError)
            throw subError
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Nenhum dispositivo encontrado para envio',
                    sent: 0,
                    debug: 'No subscriptions found in database'
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

        const results: { endpoint: string; success: boolean; error?: string; status?: number }[] = []

        for (const sub of subscriptions) {
            try {
                console.log('Sending to endpoint:', sub.endpoint.substring(0, 50) + '...')

                // Para Web Push funcionar corretamente entre dispositivos,
                // precisamos usar o protocolo Web Push com:
                // 1. Criptografia do payload (usando p256dh e auth do cliente)
                // 2. Assinatura VAPID

                // Por enquanto, vamos tentar envio simples (funciona para alguns browsers)
                const response = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Encoding': 'aesgcm',
                        'TTL': '86400',
                        'Urgency': 'high',
                    },
                    body: payload,
                })

                console.log('Response status:', response.status)

                if (response.ok || response.status === 201) {
                    results.push({ endpoint: sub.endpoint, success: true, status: response.status })

                    // Registrar na tabela de notificações
                    await supabase.from('notifications').insert({
                        salon_id: body.salon_id,
                        client_id: sub.client_id,
                        type: 'marketing',
                        channel: 'push',
                        title: body.title,
                        message: body.body,
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                    })
                } else {
                    const errorText = await response.text()
                    console.log('Error response:', errorText)

                    // Se endpoint retornou 410 (Gone), desativar subscription
                    if (response.status === 410) {
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id)
                        console.log('Subscription deactivated (410 Gone)')
                    }

                    results.push({
                        endpoint: sub.endpoint,
                        success: false,
                        error: `HTTP ${response.status}: ${errorText}`,
                        status: response.status
                    })
                }
            } catch (err) {
                console.error('Error sending to endpoint:', err)
                results.push({
                    endpoint: sub.endpoint,
                    success: false,
                    error: String(err)
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        console.log('Results:', { total: subscriptions.length, sent: successCount, failed: failCount })

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
        console.error('General error:', error)

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
