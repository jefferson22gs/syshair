// Supabase Edge Function: whatsapp-instances
// Gerencia instâncias WhatsApp via Evolution API (solve CORS issues)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

// Evolution API Config
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api.tubaraoemprestimo.com.br";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "B8959800-F546-407C-99E8-C40306E747F5";

interface InstanceRequest {
    action: 'create' | 'connect' | 'disconnect' | 'delete' | 'status' | 'fetch' | 'sendText' | 'sendBulk';
    salonId?: string;
    instanceName?: string;
    webhookUrl?: string;
    phone?: string;
    message?: string;
    phones?: string[];
    messages?: string[];
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const body: InstanceRequest = await req.json();
        const { action, salonId, instanceName, webhookUrl } = body;

        console.log(`Action: ${action}, Instance: ${instanceName}`);

        switch (action) {
            case 'create':
                return await createInstance(body, supabase);

            case 'connect':
                return await connectInstance(instanceName!);

            case 'disconnect':
                return await disconnectInstance(instanceName!);

            case 'delete':
                return await deleteInstance(instanceName!, supabase);

            case 'status':
                return await getInstanceStatus(instanceName!);

            case 'fetch':
                return await fetchInstance(instanceName!);

            case 'sendText':
                return await sendTextMessage(instanceName!, body.phone!, body.message!);

            case 'sendBulk':
                return await sendBulkMessages(instanceName!, body.phones!, body.messages || [], body.message);

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
        }
    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function createInstance(request: InstanceRequest, supabase: any) {
    const { salonId, webhookUrl } = request;

    if (!salonId) {
        return new Response(
            JSON.stringify({ error: "salonId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Generate instance name
    const { data: salon } = await supabase
        .from("salons")
        .select("name")
        .eq("id", salonId)
        .single();

    const safeName = salon?.name
        ? salon.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)
        : 'salon';
    const instanceName = `syshair_${safeName}_${salonId.substring(0, 8)}`;

    console.log(`Creating instance: ${instanceName}`);

    // Call Evolution API to create instance
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
            instanceName: instanceName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
            webhook: {
                enabled: true,
                url: webhookUrl || Deno.env.get("SUPABASE_WEBHOOK_URL"),
                webhookByEvents: true,
                events: [
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'CONNECTION_UPDATE',
                    'QRCODE_UPDATED',
                ],
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to create instance';
        try {
            const errorData = JSON.parse(errorText);
            errorMsg = errorData.message || errorData.error || errorMsg;
        } catch {
            errorMsg = errorText || errorMsg;
        }
        console.error('Evolution API error:', errorMsg);
        return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const data = await response.json();
    console.log('Instance created:', data);

    // Extract token - Evolution API v2 may return in different formats
    const instanceToken = data?.hash || data?.instance?.token || data?.token || data?.apikey || null;

    // Save to database
    const newInstance = {
        salon_id: salonId,
        instance_name: instanceName,
        instance_token: instanceToken,
        api_url: EVOLUTION_API_URL,
        status: 'disconnected',
        webhook_url: webhookUrl || Deno.env.get("SUPABASE_WEBHOOK_URL"),
    };

    // Check if instance already exists
    const { data: existing } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("salon_id", salonId)
        .single();

    if (existing) {
        // Update existing
        await supabase
            .from("whatsapp_instances")
            .update(newInstance)
            .eq("salon_id", salonId);
    } else {
        // Insert new
        await supabase
            .from("whatsapp_instances")
            .insert(newInstance);
    }

    return new Response(
        JSON.stringify({
            success: true,
            instance: {
                ...newInstance,
                instanceName: instanceName,
            },
            message: "Instância criada com sucesso!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function connectInstance(instanceName: string) {
    if (!instanceName) {
        return new Response(
            JSON.stringify({ error: "instanceName is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Connecting instance: ${instanceName}`);

    // Call Evolution API to generate QR Code
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Evolution API connect error:', errorText);
        return new Response(
            JSON.stringify({ error: "Failed to generate QR Code", details: errorText }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const data = await response.json();
    console.log('Connect response:', data);

    // Extract QR code from response
    const qrCodeData = data?.base64 || data?.qrcode?.base64 || data?.qrcode || null;
    const pairingCode = data?.pairingCode || null;

    if (!qrCodeData && !pairingCode) {
        // Maybe already connected, get status
        const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY },
        });

        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const state = statusData?.instance?.state || statusData?.state;

            return new Response(
                JSON.stringify({
                    success: true,
                    status: state,
                    message: state === 'open' ? 'Já conectado' : 'Aguardando conexão'
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "No QR Code or pairing code returned" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Format QR code for display
    const qrForDisplay = qrCodeData
        ? (qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`)
        : null;

    return new Response(
        JSON.stringify({
            success: true,
            qrcode: qrForDisplay,
            pairingCode: pairingCode,
            status: qrForDisplay ? 'qrcode' : (pairingCode ? 'pairing' : 'unknown')
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function disconnectInstance(instanceName: string) {
    if (!instanceName) {
        return new Response(
            JSON.stringify({ error: "instanceName is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Disconnecting instance: ${instanceName}`);

    const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Evolution API disconnect error:', errorText);
        return new Response(
            JSON.stringify({ error: "Failed to disconnect", details: errorText }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
        JSON.stringify({
            success: true,
            message: "Desconectado com sucesso"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function deleteInstance(instanceName: string, supabase: any) {
    if (!instanceName) {
        return new Response(
            JSON.stringify({ error: "instanceName is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Deleting instance: ${instanceName}`);

    // Delete from Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    // Even if API fails, try to delete from database
    await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("instance_name", instanceName);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Evolution API delete error:', errorText);
        return new Response(
            JSON.stringify({
                success: true,
                message: "Instância removida do banco de dados (pode ainda existir na API)",
                apiError: errorText
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
        JSON.stringify({
            success: true,
            message: "Instância excluída com sucesso"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function getInstanceStatus(instanceName: string) {
    if (!instanceName) {
        return new Response(
            JSON.stringify({ error: "instanceName is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Try connectionState endpoint
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    if (response.ok) {
        const data = await response.json();
        const state = data?.instance?.state || data?.state || data?.status || 'close';

        let status: string = 'disconnected';
        if (state === 'open' || state === 'CONNECTED' || state === 'connected') status = 'connected';
        else if (state === 'connecting' || state === 'PAIRING') status = 'connecting';
        else if (state === 'close' || state === 'DISCONNECTED') status = 'disconnected';

        return new Response(
            JSON.stringify({
                success: true,
                status: status,
                state: state,
                instance: data?.instance || data
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Fallback: try fetchInstances
    const altResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    if (altResponse.ok) {
        const data = await altResponse.json();
        const instanceData = Array.isArray(data)
            ? data.find((i: any) => i.instance?.instanceName === instanceName)
            : data;
        const state = instanceData?.instance?.state || instanceData?.state || 'close';

        let status: string = 'disconnected';
        if (state === 'open' || state === 'CONNECTED' || state === 'connected') status = 'connected';
        else if (state === 'connecting' || state === 'PAIRING') status = 'connecting';
        else if (state === 'close' || state === 'DISCONNECTED') status = 'disconnected';

        const phoneNumber = instanceData?.instance?.owner
            ? instanceData.instance.owner.split('@')[0]
            : null;

        return new Response(
            JSON.stringify({
                success: true,
                status: status,
                state: state,
                phoneNumber: phoneNumber,
                instance: instanceData?.instance || instanceData
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Instance not found
    return new Response(
        JSON.stringify({
            success: false,
            error: "Instance not found",
            status: 'not_found'
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function fetchInstance(instanceName: string) {
    if (!instanceName) {
        return new Response(
            JSON.stringify({ error: "instanceName is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: {
            'apikey': EVOLUTION_API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(
            JSON.stringify({ error: "Failed to fetch instance", details: errorText }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const data = await response.json();
    const instanceData = Array.isArray(data)
        ? data.find((i: any) => i.instance?.instanceName === instanceName)
        : data;

    return new Response(
        JSON.stringify({
            success: true,
            instance: instanceData?.instance || instanceData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function sendTextMessage(instanceName: string, phone: string, message: string) {
    if (!instanceName || !phone || !message) {
        return new Response(
            JSON.stringify({ error: "instanceName, phone, and message are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Clean phone number - remove non-digits and ensure country code
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
    }

    console.log(`Sending message to ${cleanPhone} via instance ${instanceName}`);

    try {
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
                number: cleanPhone,
                text: message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Evolution API sendText error:', errorText);
            return new Response(
                JSON.stringify({ success: false, error: `Failed to send message: ${errorText}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await response.json();
        console.log('Message sent successfully:', data);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Mensagem enviada com sucesso",
                data: data,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error('Error sending text message:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
}

async function sendBulkMessages(instanceName: string, phones: string[], messages: string[], defaultMessage?: string) {
    if (!instanceName || !phones || phones.length === 0) {
        return new Response(
            JSON.stringify({ error: "instanceName and phones array are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Sending bulk messages to ${phones.length} numbers via instance ${instanceName}`);

    const results: { phone: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < phones.length; i++) {
        const phone = phones[i];
        const messageText = messages[i] || defaultMessage || '';

        if (!messageText) {
            results.push({ phone, success: false, error: 'No message provided' });
            failCount++;
            continue;
        }

        // Clean phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone;
        }

        try {
            const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY,
                },
                body: JSON.stringify({
                    number: cleanPhone,
                    text: messageText,
                }),
            });

            if (response.ok) {
                results.push({ phone: cleanPhone, success: true });
                successCount++;
            } else {
                const errorText = await response.text();
                results.push({ phone: cleanPhone, success: false, error: errorText });
                failCount++;
            }
        } catch (error) {
            results.push({ phone: cleanPhone, success: false, error: error.message });
            failCount++;
        }

        // Delay between messages to avoid rate limiting (1.5 seconds)
        if (i < phones.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    console.log(`Bulk send complete: ${successCount} success, ${failCount} failed`);

    return new Response(
        JSON.stringify({
            success: true,
            sent: successCount,
            failed: failCount,
            total: phones.length,
            results: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
