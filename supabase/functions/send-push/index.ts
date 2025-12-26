// Edge Function: send-push
// Envia push notifications usando Web Push simples

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

// Criptografia ECDH + AES-GCM para Web Push
async function encryptPayload(payload: string, p256dhKey: string, authSecret: string): Promise<{
    ciphertext: Uint8Array;
    salt: Uint8Array;
    publicKey: Uint8Array;
}> {
    // Decodificar chaves do subscriber
    const subscriberPublicKey = base64UrlDecode(p256dhKey);
    const subscriberAuth = base64UrlDecode(authSecret);

    // Gerar chave local (server key pair)
    const localKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );

    // Exportar chave pública local
    const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
    const localPublicKey = new Uint8Array(localPublicKeyRaw);

    // Importar chave pública do subscriber
    const subscriberKey = await crypto.subtle.importKey(
        'raw',
        subscriberPublicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    // Derivar shared secret via ECDH
    const sharedSecretBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: subscriberKey },
        localKeyPair.privateKey,
        256
    );
    const sharedSecret = new Uint8Array(sharedSecretBits);

    // Gerar salt aleatório
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // HKDF para derivar as chaves de criptografia
    // PRK = HMAC-SHA256(auth, sharedSecret)
    const authKey = await crypto.subtle.importKey(
        'raw', subscriberAuth, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const prkBuffer = await crypto.subtle.sign('HMAC', authKey, sharedSecret);
    const prk = new Uint8Array(prkBuffer);

    // Info for content encryption key
    const keyInfoStr = 'Content-Encoding: aes128gcm\x00';
    const keyInfo = new TextEncoder().encode(keyInfoStr);

    // Info for nonce
    const nonceInfoStr = 'Content-Encoding: nonce\x00';
    const nonceInfo = new TextEncoder().encode(nonceInfoStr);

    // Derive CEK (Content Encryption Key)
    const prkKey = await crypto.subtle.importKey(
        'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );

    // Simplified: use salt + info for key derivation
    const cekInput = new Uint8Array([...salt, ...keyInfo, 1]);
    const cekBuffer = await crypto.subtle.sign('HMAC', prkKey, cekInput);
    const cek = new Uint8Array(cekBuffer).slice(0, 16);

    // Derive nonce
    const nonceInput = new Uint8Array([...salt, ...nonceInfo, 1]);
    const nonceBuffer = await crypto.subtle.sign('HMAC', prkKey, nonceInput);
    const nonce = new Uint8Array(nonceBuffer).slice(0, 12);

    // Encrypt payload with AES-GCM
    const aesKey = await crypto.subtle.importKey(
        'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
    );

    const payloadBytes = new TextEncoder().encode(payload);
    // Add padding delimiter
    const paddedPayload = new Uint8Array([...payloadBytes, 2]);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        paddedPayload
    );
    const encrypted = new Uint8Array(encryptedBuffer);

    // Build aes128gcm body
    // Header: salt (16) + rs (4) + idlen (1) + keyid (65)
    const recordSize = new Uint8Array([0, 0, 16, 0]); // 4096 bytes
    const idLen = new Uint8Array([65]); // length of public key

    const body = new Uint8Array([
        ...salt,
        ...recordSize,
        ...idLen,
        ...localPublicKey,
        ...encrypted
    ]);

    return {
        ciphertext: body,
        salt,
        publicKey: localPublicKey
    };
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
        console.log('Request:', { salon_id: body.salon_id, title: body.title })

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

        // Payload da notificação
        const notificationPayload = JSON.stringify({
            title: body.title,
            body: body.body,
            icon: body.icon || '/pwa-192x192.png',
            url: body.data?.url || '/',
            data: body.data
        });

        console.log('Payload:', notificationPayload);

        const results: { endpoint: string; success: boolean; error?: string; status?: number }[] = []

        for (const sub of subscriptions) {
            try {
                console.log('Enviando para:', sub.endpoint.substring(0, 50) + '...')

                const endpointUrl = new URL(sub.endpoint);
                const jwt = await createVapidJwt(endpointUrl.origin);
                const authHeader = `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;

                let response: Response;

                // Tentar enviar com payload criptografado se tiver as chaves
                if (sub.p256dh && sub.auth) {
                    try {
                        console.log('Criptografando payload...');
                        const { ciphertext } = await encryptPayload(notificationPayload, sub.p256dh, sub.auth);

                        response = await fetch(sub.endpoint, {
                            method: 'POST',
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/octet-stream',
                                'Content-Encoding': 'aes128gcm',
                                'TTL': '86400',
                                'Urgency': 'high',
                            },
                            body: ciphertext,
                        });

                        console.log('Response com payload:', response.status);
                    } catch (encryptError) {
                        console.log('Erro na criptografia, enviando sem payload:', encryptError);
                        // Fallback: enviar sem payload
                        response = await fetch(sub.endpoint, {
                            method: 'POST',
                            headers: {
                                'Authorization': authHeader,
                                'TTL': '86400',
                                'Urgency': 'high',
                                'Content-Length': '0',
                            },
                        });
                    }
                } else {
                    // Sem chaves, enviar sem payload
                    response = await fetch(sub.endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': authHeader,
                            'TTL': '86400',
                            'Urgency': 'high',
                            'Content-Length': '0',
                        },
                    });
                }

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
                console.error('Erro:', err)
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
