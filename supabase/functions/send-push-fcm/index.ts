// Edge Function: send-push-fcm
// Envia push notifications via Firebase Cloud Messaging (FCM)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Firebase Service Account
const FIREBASE_PROJECT_ID = 'belezatech-infinite';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@belezatech-infinite.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || '';

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    url?: string
    data?: Record<string, any>
}

// Gerar JWT para autenticação com Google APIs
async function getAccessToken(): Promise<string> {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // Criar header do JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: FIREBASE_CLIENT_EMAIL,
        sub: FIREBASE_CLIENT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    // Encode header e payload
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsigned = `${headerB64}.${payloadB64}`;

    // Importar chave privada
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey.substring(
        privateKey.indexOf(pemHeader) + pemHeader.length,
        privateKey.indexOf(pemFooter)
    ).replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Assinar
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(unsigned)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${unsigned}.${signatureB64}`;

    // Trocar JWT por access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
        console.error('Erro ao obter access token:', tokenData);
        throw new Error('Failed to get access token');
    }

    return tokenData.access_token;
}

// Enviar notificação via FCM
async function sendFCMNotification(
    accessToken: string,
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<boolean> {
    const message = {
        message: {
            token: fcmToken,
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                notification: {
                    title: title,
                    body: body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    actions: [
                        { action: 'open', title: '🔔 Abrir' },
                        { action: 'close', title: '❌ Fechar' }
                    ]
                },
                fcm_options: {
                    link: data?.url || '/'
                },
                data: data ? Object.fromEntries(
                    Object.entries(data).map(([k, v]) => [k, String(v)])
                ) : undefined
            },
            android: {
                notification: {
                    click_action: 'OPEN_ACTIVITY'
                }
            }
        }
    };

    const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        }
    );

    if (response.ok) {
        console.log('✅ FCM enviado com sucesso');
        return true;
    } else {
        const error = await response.text();
        console.error('❌ Erro FCM:', response.status, error);
        return false;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🔔 send-push-fcm iniciado');

        if (!FIREBASE_PRIVATE_KEY) {
            throw new Error('FIREBASE_PRIVATE_KEY não está configurada');
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

        // Buscar tokens FCM ativos
        const { data: fcmSubscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('is_active', true)
            .not('fcm_token', 'is', null)

        if (subError) throw subError

        console.log('Total de subscriptions FCM:', fcmSubscriptions?.length || 0)

        // Se não houver FCM tokens, tentar VAPID (sistema antigo)
        if (!fcmSubscriptions || fcmSubscriptions.length === 0) {
            console.log('Nenhum FCM token - tentando VAPID...');

            // Buscar subscriptions VAPID ativas
            const { data: vapidSubs } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('is_active', true)
                .not('endpoint', 'is', null);

            if (vapidSubs && vapidSubs.length > 0) {
                console.log('Encontradas', vapidSubs.length, 'subscriptions VAPID - chamando send-push antigo...');

                // Chamar a função send-push antiga que usa VAPID
                const vapidResponse = await fetch(
                    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        },
                        body: JSON.stringify(body)
                    }
                );

                const vapidResult = await vapidResponse.json();
                return new Response(
                    JSON.stringify({ success: true, method: 'vapid_fallback', ...vapidResult }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Nenhum dispositivo encontrado', sent: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const subscriptions = fcmSubscriptions;

        // Obter access token do Google
        const accessToken = await getAccessToken();
        console.log('✅ Access token obtido');

        // Salvar notificação no banco
        const notificationId = crypto.randomUUID();
        await supabase.from('notifications').insert({
            id: notificationId,
            salon_id: body.salon_id,
            type: body.data?.type || 'marketing',
            channel: 'push',
            title: body.title,
            message: body.body,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: body.data ? JSON.stringify(body.data) : null,
        });

        const results: { token: string; success: boolean; error?: string }[] = []

        for (const sub of subscriptions) {
            try {
                const success = await sendFCMNotification(
                    accessToken,
                    sub.fcm_token,
                    body.title,
                    body.body,
                    body.data
                );

                results.push({ token: sub.fcm_token.substring(0, 20) + '...', success })

                if (!success) {
                    // Desativar token inválido
                    await supabase.from('push_subscriptions')
                        .update({ is_active: false })
                        .eq('id', sub.id);
                }
            } catch (err) {
                console.error('Erro ao enviar:', err)
                results.push({ token: sub.fcm_token.substring(0, 20) + '...', success: false, error: String(err) })
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
