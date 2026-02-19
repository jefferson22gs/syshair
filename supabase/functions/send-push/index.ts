// Edge Function: send-push
// Envia push notifications via Firebase Cloud Messaging HTTP v1 API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Firebase project config
const FIREBASE_PROJECT_ID = 'belezatech-infinite'

interface SendPushRequest {
    salon_id: string
    client_ids?: string[]
    title: string
    body: string
    icon?: string
    url?: string
    data?: Record<string, any>
}

// Criar JWT para autenticação com Firebase
async function createFirebaseJWT(): Promise<string> {
    const privateKeyPem = Deno.env.get('FIREBASE_PRIVATE_KEY') || ''
    const serviceEmail = `firebase-adminsdk-fbsvc@${FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`

    if (!privateKeyPem) {
        throw new Error('FIREBASE_PRIVATE_KEY não configurada')
    }

    // Formatar a chave privada (substituir \\n por quebras de linha reais)
    const formattedKey = privateKeyPem.replace(/\\n/g, '\n')

    // Importar a chave privada
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = formattedKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iss: serviceEmail,
        sub: serviceEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    }

    // Criar JWT manualmente
    const header = { alg: 'RS256', typ: 'JWT' }
    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const unsignedToken = `${headerB64}.${payloadB64}`

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(unsignedToken)
    )

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    return `${unsignedToken}.${signatureB64}`
}

// Obter access token do Google
async function getAccessToken(): Promise<string> {
    const jwt = await createFirebaseJWT()

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('Erro ao obter access token:', data)
        throw new Error(data.error_description || 'Falha ao obter access token')
    }

    return data.access_token
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🔔 send-push (FCM v1) iniciado')

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

        // Salvar notificação no banco
        const notificationId = crypto.randomUUID()
        await supabase.from('notifications').insert({
            id: notificationId,
            salon_id: body.salon_id,
            type: body.data?.type || 'marketing',
            channel: 'push',
            title: body.title,
            message: body.body,
            status: 'sent',
            sent_at: new Date().toISOString(),
        })
        console.log('✅ Notificação salva:', notificationId)

        // Buscar subscriptions com FCM token
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

        // Filtrar subscriptions com FCM token
        const fcmSubscriptions = subscriptions.filter(sub => sub.fcm_token)
        console.log('FCM tokens encontrados:', fcmSubscriptions.length)

        if (fcmSubscriptions.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'Nenhum token FCM', sent: 0, total: subscriptions.length }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Obter access token do Google
        let accessToken: string
        try {
            accessToken = await getAccessToken()
            console.log('✅ Access token obtido')
        } catch (tokenError) {
            console.error('Erro ao obter access token:', tokenError)
            return new Response(
                JSON.stringify({ success: false, error: 'Erro de autenticação Firebase: ' + String(tokenError) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const results: { token: string; success: boolean; error?: string }[] = []

        // Enviar para cada token FCM via HTTP v1 API
        for (const sub of fcmSubscriptions) {
            try {
                console.log('Enviando para token:', sub.fcm_token.substring(0, 30) + '...')

                const message = {
                    message: {
                        token: sub.fcm_token,
                        notification: {
                            title: body.title,
                            body: body.body,
                        },
                        webpush: {
                            notification: {
                                icon: body.icon || '/pwa-192x192.png',
                                badge: '/pwa-192x192.png',
                                requireInteraction: true,
                            },
                            fcm_options: {
                                link: body.url || '/admin/marketing'
                            }
                        },
                        data: {
                            title: body.title,
                            body: body.body,
                            url: body.url || '/admin/marketing',
                            timestamp: Date.now().toString(),
                            notificationId: notificationId,
                        }
                    }
                }

                const response = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(message)
                    }
                )

                const result = await response.json()

                if (response.ok) {
                    console.log('✅ Mensagem enviada:', result.name)
                    results.push({ token: sub.fcm_token.substring(0, 20) + '...', success: true })
                } else {
                    console.error('❌ Erro FCM:', result)
                    results.push({
                        token: sub.fcm_token.substring(0, 20) + '...',
                        success: false,
                        error: result.error?.message || 'FCM error'
                    })

                    // Desativar tokens inválidos
                    if (result.error?.code === 404 || result.error?.message?.includes('not found')) {
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id)
                        console.log('Token desativado (não encontrado)')
                    }
                }
            } catch (err) {
                console.error('Erro ao enviar:', err)
                results.push({ token: sub.fcm_token.substring(0, 20) + '...', success: false, error: String(err) })
            }
        }

        const sent = results.filter(r => r.success).length

        return new Response(
            JSON.stringify({
                success: true,
                total: subscriptions.length,
                fcmTokens: fcmSubscriptions.length,
                sent,
                failed: results.length - sent,
                results
            }),
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
