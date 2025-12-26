// Edge Function: send-push
// Envia push notifications para dispositivos via Web Push API com autenticação VAPID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys
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

// Base64URL encode
function base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Base64URL decode
function base64UrlDecode(str: string): Uint8Array {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Criar JWT para VAPID
async function createVapidAuthHeader(endpoint: string): Promise<string> {
    try {
        const endpointUrl = new URL(endpoint);
        const audience = endpointUrl.origin;

        // JWT Header
        const header = { typ: 'JWT', alg: 'ES256' };

        // JWT Payload
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            aud: audience,
            exp: now + 43200, // 12 horas
            sub: VAPID_SUBJECT,
        };

        const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
        const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
        const unsignedToken = `${headerB64}.${payloadB64}`;

        // Importar chave privada ECDSA P-256
        const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);

        // Criar uma chave JWK para importar
        const jwk = {
            kty: 'EC',
            crv: 'P-256',
            x: base64UrlEncode(base64UrlDecode(VAPID_PUBLIC_KEY).slice(1, 33)),
            y: base64UrlEncode(base64UrlDecode(VAPID_PUBLIC_KEY).slice(33, 65)),
            d: base64UrlEncode(privateKeyBytes),
        };

        const key = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
        );

        // Assinar
        const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            key,
            new TextEncoder().encode(unsignedToken)
        );

        // Converter assinatura DER para raw format (r || s)
        const signatureArray = new Uint8Array(signature);
        let r, s;
        if (signatureArray.length === 64) {
            r = signatureArray.slice(0, 32);
            s = signatureArray.slice(32, 64);
        } else {
            // Já está no formato correto
            r = signatureArray.slice(0, 32);
            s = signatureArray.slice(32, 64);
        }
        const rawSignature = new Uint8Array([...r, ...s]);
        const signatureB64 = base64UrlEncode(rawSignature);

        const jwt = `${unsignedToken}.${signatureB64}`;

        return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;
    } catch (e) {
        console.error('Erro ao criar VAPID auth header:', e);
        throw e;
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🔔 send-push iniciado');
        console.log('VAPID_PRIVATE_KEY definida?', !!VAPID_PRIVATE_KEY, 'tamanho:', VAPID_PRIVATE_KEY.length);

        if (!VAPID_PRIVATE_KEY) {
            throw new Error('VAPID_PRIVATE_KEY não está configurada');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body: SendPushRequest = await req.json()

        console.log('Request:', { salon_id: body.salon_id, title: body.title })

        if (!body.title || !body.body) {
            return new Response(
                JSON.stringify({ success: false, error: 'Título e mensagem são obrigatórios' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Buscar TODAS as subscriptions ativas
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('is_active', true)

        if (subError) {
            console.error('Erro ao buscar subscriptions:', subError)
            throw subError
        }

        console.log('Total de subscriptions ativas:', subscriptions?.length || 0)

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

        const results: { endpoint: string; success: boolean; error?: string; status?: number }[] = []

        for (const sub of subscriptions) {
            try {
                console.log('Enviando para:', sub.endpoint.substring(0, 60) + '...')

                // Criar header de autorização VAPID
                const authHeader = await createVapidAuthHeader(sub.endpoint);
                console.log('Auth header criado:', authHeader.substring(0, 50) + '...');

                // Enviar notificação com autenticação VAPID
                const response = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/octet-stream',
                        'Content-Encoding': 'aes128gcm',
                        'TTL': '86400',
                        'Urgency': 'high',
                    },
                    body: new TextEncoder().encode(payload),
                })

                console.log('Response status:', response.status)

                if (response.ok || response.status === 201) {
                    results.push({ endpoint: sub.endpoint, success: true, status: response.status })

                    // Registrar na tabela de notificações
                    await supabase.from('notifications').insert({
                        salon_id: body.salon_id || sub.salon_id,
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
                    console.log('Erro response:', errorText)

                    // Se endpoint retornou 410 (Gone), desativar subscription
                    if (response.status === 410) {
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id)
                        console.log('Subscription desativada (410 Gone)')
                    }

                    results.push({
                        endpoint: sub.endpoint,
                        success: false,
                        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
                        status: response.status
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
