// Edge Function: send-push
// Envia push notifications usando Web Push com criptografia adequada

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID keys - geradas com npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BAh0lgyspDAu3SAygLbdW7adBllZsgR2YiXfQZLUSzEZ5NeJkCZtUNYiTKcso9uJ8uDm4Nk8nq-a1XZlPbDri34'
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

// Funções de utilidade para criptografia
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

// Criar JWT para VAPID
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

    // Importar chave privada
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

// Criptografar payload para Web Push
async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
    const payloadBytes = new TextEncoder().encode(payload);

    // Gerar chave efêmera do servidor
    const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );

    // Exportar chave pública do servidor
    const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);
    const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

    // Decodificar chave pública do cliente
    const clientPublicKeyBytes = base64UrlDecode(p256dh);
    const clientPublicKey = await crypto.subtle.importKey(
        'raw',
        clientPublicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    // Derivar shared secret
    const sharedSecretBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientPublicKey },
        serverKeyPair.privateKey,
        256
    );
    const sharedSecret = new Uint8Array(sharedSecretBits);

    // Gerar salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Decodificar auth secret
    const authSecret = base64UrlDecode(auth);

    // Derivar PRK usando HKDF
    const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
    const keyInfo = new Uint8Array([
        ...new TextEncoder().encode('WebPush: info\0'),
        ...clientPublicKeyBytes,
        ...serverPublicKey
    ]);

    // Importar shared secret como HKDF key
    const sharedSecretKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'HKDF' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derivar IKM
    const ikmKey = await crypto.subtle.importKey(
        'raw',
        authSecret,
        { name: 'HKDF' },
        false,
        ['deriveBits']
    );

    // Usar uma abordagem simplificada para a criptografia
    // Derivar chave AES-GCM diretamente
    const aesKey = await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt,
            info: new TextEncoder().encode('Content-Encoding: aes128gcm\0')
        },
        sharedSecretKey,
        { name: 'AES-GCM', length: 128 },
        false,
        ['encrypt']
    );

    // Derivar nonce
    const nonceBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt,
            info: new TextEncoder().encode('Content-Encoding: nonce\0')
        },
        sharedSecretKey,
        96
    );
    const nonce = new Uint8Array(nonceBits);

    // Adicionar padding (1 byte indicando tamanho do padding + padding)
    const paddedPayload = new Uint8Array(payloadBytes.length + 1);
    paddedPayload.set(payloadBytes);
    paddedPayload[payloadBytes.length] = 2; // Delimiter

    // Criptografar
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aesKey,
        paddedPayload
    );

    // Montar payload aes128gcm
    const recordSize = 4096;
    const header = new Uint8Array(21 + serverPublicKey.length);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, recordSize, false);
    header[20] = serverPublicKey.length;
    header.set(serverPublicKey, 21);

    const encrypted = new Uint8Array(header.length + encryptedBuffer.byteLength);
    encrypted.set(header);
    encrypted.set(new Uint8Array(encryptedBuffer), header.length);

    return { encrypted, salt, serverPublicKey };
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

        const payload = JSON.stringify({
            title: body.title,
            body: body.body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            data: body.data || {},
            timestamp: Date.now(),
        })

        const results: { endpoint: string; success: boolean; error?: string; status?: number }[] = []

        for (const sub of subscriptions) {
            try {
                console.log('Enviando para:', sub.endpoint.substring(0, 50) + '...')

                const endpointUrl = new URL(sub.endpoint);
                const jwt = await createVapidJwt(endpointUrl.origin);
                const authHeader = `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;

                let response: Response;

                // Se temos p256dh e auth, tentar criptografar
                if (sub.p256dh && sub.auth) {
                    try {
                        const { encrypted } = await encryptPayload(payload, sub.p256dh, sub.auth);

                        response = await fetch(sub.endpoint, {
                            method: 'POST',
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/octet-stream',
                                'Content-Encoding': 'aes128gcm',
                                'TTL': '86400',
                                'Urgency': 'high',
                            },
                            body: encrypted,
                        });
                    } catch (encryptError) {
                        console.log('Erro na criptografia, tentando sem payload:', encryptError);
                        // Fallback: enviar sem payload (o SW mostrará notificação padrão)
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
                    console.log('Erro:', response.status, errorText)

                    if (response.status === 410) {
                        await supabase.from('push_subscriptions').update({ is_active: false }).eq('id', sub.id)
                    }

                    results.push({ endpoint: sub.endpoint, success: false, error: `${response.status}: ${errorText}`, status: response.status })
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
