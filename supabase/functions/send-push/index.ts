// Edge Function: send-push
// Envia push notifications - versão simples sem payload (funciona garantido)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys
const VAPID_PUBLIC_KEY = 'BAh0lgyspDAu3SAygLbdW7adBllZsgR2YiXfQZLUSzEZ5NeJkCZtUNYiTKcso9uJ8uDm4Nk8nq-a1XZlPbDri34'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = 'mailto:contato@syshair.app'

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    url?: string
    data?: Record<string, any>
}

function base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

async function createVapidJwt(audience: string): Promise<string> {
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: audience,
        exp: now + 43200,
        sub: VAPID_SUBJECT,
    };

    const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
    const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);

    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
        y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
        d: base64UrlEncode(privateKeyBytes),
    };

    const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(unsignedToken)
    );

    const signatureBytes = new Uint8Array(signature);
    return `${unsignedToken}.${base64UrlEncode(signatureBytes)}`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🔔 send-push iniciado');

        if (!VAPID_PRIVATE_KEY) {
            throw new Error('VAPID_PRIVATE_KEY não está configurada');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body: SendPushRequest = await req.json()
        console.log('Request:', { salon_id: body.salon_id, title: body.title, body: body.body })

        if (!body.title || !body.body) {
            return new Response(
                JSON.stringify({ success: false, error: 'Título e mensagem são obrigatórios' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Buscar subscriptions ativas
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('is_active', true)

        if (subError) throw subError

        console.log('Total de subscriptions:', subscriptions?.length || 0)

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'Nenhum dispositivo', sent: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Salvar notificação no banco para referência
        try {
            const notificationId = crypto.randomUUID();
            await supabase.from('notifications').insert({
                id: notificationId,
                salon_id: body.salon_id,
                type: 'marketing',
                channel: 'push',
                title: body.title,
                message: body.body,
                status: 'sent',
                sent_at: new Date().toISOString(),
            });
        } catch (err) {
            console.log('Erro ao salvar notificação:', err);
        }

        const results: { endpoint: string; success: boolean; error?: string; status?: number }[] = []

        for (const sub of subscriptions) {
            try {
                console.log('Enviando para:', sub.endpoint.substring(0, 60) + '...')

                const endpointUrl = new URL(sub.endpoint);
                const jwt = await createVapidJwt(endpointUrl.origin);
                const authHeader = `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;

                // Enviar push SEM payload (trigger apenas)
                // O Service Worker mostrará a notificação padrão
                const response = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader,
                        'TTL': '86400',
                        'Urgency': 'high',
                        'Content-Length': '0',
                    },
                });

                console.log('Response status:', response.status)

                if (response.ok || response.status === 201) {
                    results.push({ endpoint: sub.endpoint, success: true, status: response.status })
                } else {
                    const responseText = await response.text();
                    console.log('Erro:', response.status, responseText)

                    if (response.status === 410) {
                        await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id)
                        console.log('Subscription desativada (410 Gone)');
                    }

                    results.push({ endpoint: sub.endpoint, success: false, error: `${response.status}: ${responseText}`, status: response.status })
                }
            } catch (err) {
                console.error('Erro ao enviar:', err)
                results.push({ endpoint: sub.endpoint, success: false, error: String(err) })
            }
        }

        const sent = results.filter(r => r.success).length

        return new Response(
            JSON.stringify({ success: true, total: subscriptions.length, sent, failed: results.length - sent, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Erro geral:', error)
        return new Response(
            JSON.stringify({ success: false, error: String(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
