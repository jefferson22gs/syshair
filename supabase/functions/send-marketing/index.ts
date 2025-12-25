// Edge Function: send-marketing
// Envia notificações de marketing para múltiplos clientes
// Chamada pela página de Marketing do Admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMarketingRequest {
    salon_id: string
    client_ids: string[]
    title?: string
    message: string
    channel: 'whatsapp' | 'push'
    type: 'promotional' | 'informative' | 'coupon'
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

        const body: SendMarketingRequest = await req.json()

        if (!body.salon_id || !body.client_ids || body.client_ids.length === 0 || !body.message) {
            return new Response(
                JSON.stringify({ success: false, error: 'Parâmetros inválidos' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Buscar clientes selecionados
        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('id, name, phone')
            .in('id', body.client_ids)
            .eq('salon_id', body.salon_id)

        if (clientsError) {
            throw clientsError
        }

        const now = new Date().toISOString()
        const notifications = []
        const results: { client_id: string; name: string; status: string; error?: string }[] = []

        for (const client of clients || []) {
            // Personalizar mensagem
            const personalizedMessage = body.message.replace(
                /{nome}/gi,
                client.name?.split(' ')[0] || 'Cliente'
            )

            if (body.channel === 'whatsapp' && client.phone) {
                // Criar registro da notificação
                const { data: notif, error: insertError } = await supabase
                    .from('notifications')
                    .insert({
                        salon_id: body.salon_id,
                        client_id: client.id,
                        type: body.type || 'marketing',
                        channel: 'whatsapp',
                        title: body.title,
                        message: personalizedMessage,
                        phone: client.phone,
                        status: 'sent', // Já consideramos enviado pois abrirá no frontend
                        sent_at: now
                    })
                    .select()
                    .single()

                if (insertError) {
                    console.error('Erro ao inserir notificação:', insertError)
                    results.push({ client_id: client.id, name: client.name, status: 'failed', error: insertError.message })
                } else {
                    results.push({ client_id: client.id, name: client.name, status: 'sent' })
                }
            } else {
                results.push({
                    client_id: client.id,
                    name: client.name,
                    status: 'skipped',
                    error: 'Sem telefone ou canal não suportado'
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                total: clients?.length || 0,
                sent: results.filter(r => r.status === 'sent').length,
                failed: results.filter(r => r.status === 'failed').length,
                skipped: results.filter(r => r.status === 'skipped').length,
                results
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
