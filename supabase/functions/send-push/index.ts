// Edge Function: send-push
// Envia push notifications para dispositivos via Web Push API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys - geradas em https://web-push-codelab.glitch.me/
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = 'mailto:contato@syshair.app'

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    data?: Record<string, any>
}

// Utilitários para Web Push

function base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(base64 + padding);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Cria JWT para autenticação VAPID
async function createVapidJwt(audience: string): Promise<string> {
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: audience,
        exp: now + 86400, // 24 hours
        sub: VAPID_SUBJECT,
    };

    const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Importar chave privada VAPID
    const privateKeyData = base64UrlDecode(VAPID_PRIVATE_KEY);

    // Criar chave para assinatura ES256
    const keyData = new Uint8Array(32);
    keyData.set(privateKeyData.slice(0, 32));

    try {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            cryptoKey,
            new TextEncoder().encode(unsignedToken)
        );

        return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
    } catch (e) {
        console.error('Erro ao criar JWT VAPID:', e);
        // Fallback: retornar token sem assinatura válida (não funcionará, mas é útil para debug)
        return unsignedToken;
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🔔 send-push iniciado');
        console.log('VAPID_PRIVATE_KEY definida?', !!VAPID_PRIVATE_KEY);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body: SendPushRequest = await req.json()

        console.log('Request:', { salon_id: body.salon_id, title: body.title, client_ids: body.client_ids?.length || 0 })

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

        console.log('Subscriptions encontradas:', subscriptions?.length || 0)

        if (subError) {
            console.error('Erro ao buscar subscriptions:', subError)
            throw subError
        }

        if (!subscriptions || subscriptions.length === 0) {
            // Tentar buscar todas as subscriptions (sem filtro de salon_id) para debug
            const { data: allSubs } = await supabase
                .from('push_subscriptions')
                .select('id, salon_id, is_active')

            console.log('DEBUG - Todas as subscriptions:', allSubs)

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Nenhum dispositivo encontrado para envio',
                    sent: 0,
                    debug: {
                        salon_id_buscado: body.salon_id,
                        total_subscriptions_no_banco: allSubs?.length || 0,
                        subscriptions_detalhes: allSubs
                    }
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
                console.log('Enviando para:', sub.endpoint.substring(0, 60) + '...')

                // Extrair origem do endpoint para VAPID audience
                const endpointUrl = new URL(sub.endpoint);
                const audience = endpointUrl.origin;

                // Tentar envio com diferentes métodos

                // Método 1: Envio simples (funciona para alguns navegadores/endpoints)
                const simpleResponse = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'TTL': '86400',
                        'Urgency': 'high',
                    },
                    body: new TextEncoder().encode(payload),
                })

                console.log('Response status:', simpleResponse.status)

                if (simpleResponse.ok || simpleResponse.status === 201) {
                    results.push({ endpoint: sub.endpoint, success: true, status: simpleResponse.status })

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
                    const errorText = await simpleResponse.text()
                    console.log('Erro response:', errorText)

                    // Se endpoint retornou 410 (Gone), desativar subscription
                    if (simpleResponse.status === 410) {
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id)
                        console.log('Subscription desativada (410 Gone)')
                    }

                    results.push({
                        endpoint: sub.endpoint,
                        success: false,
                        error: `HTTP ${simpleResponse.status}: ${errorText.substring(0, 200)}`,
                        status: simpleResponse.status
                    })
                }
            } catch (err) {
                console.error('Erro ao enviar para endpoint:', err)
                results.push({
                    endpoint: sub.endpoint,
                    success: false,
                    error: String(err)
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        console.log('Resultados:', { total: subscriptions.length, sent: successCount, failed: failCount })

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
