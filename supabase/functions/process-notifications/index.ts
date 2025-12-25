// Edge Function: process-notifications
// Processa notificações pendentes e agendadas
// Executar via Cron: 0 * * * * (a cada hora)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Notification {
    id: string
    salon_id: string
    client_id: string | null
    appointment_id: string | null
    type: string
    channel: string
    title: string | null
    message: string
    phone: string | null
    status: string
    scheduled_for: string | null
    salons?: { name: string; whatsapp: string | null }
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

        const now = new Date().toISOString()

        // 1. Buscar notificações agendadas prontas para envio
        const { data: scheduledNotifications, error: scheduledError } = await supabase
            .from('notifications')
            .select(`
        *,
        salons:salon_id (name, whatsapp)
      `)
            .eq('status', 'scheduled')
            .lte('scheduled_for', now)
            .limit(100)

        if (scheduledError) {
            throw scheduledError
        }

        // 2. Buscar notificações pendentes (marketing, birthday, etc)
        const { data: pendingNotifications, error: pendingError } = await supabase
            .from('notifications')
            .select(`
        *,
        salons:salon_id (name, whatsapp)
      `)
            .eq('status', 'pending')
            .limit(100)

        if (pendingError) {
            throw pendingError
        }

        const allNotifications = [
            ...(scheduledNotifications || []),
            ...(pendingNotifications || [])
        ] as Notification[]

        const results: { id: string; status: string; error?: string }[] = []

        for (const notif of allNotifications) {
            try {
                if (notif.channel === 'whatsapp' && notif.phone) {
                    // Para WhatsApp, precisamos de uma API externa
                    // Por enquanto, apenas logamos e marcamos como enviado
                    // TODO: Integrar com Evolution API, Baileys, ou Twilio

                    console.log(`[WhatsApp] Enviando para ${notif.phone}: ${notif.message}`)

                    // Marcar como enviado
                    await supabase
                        .from('notifications')
                        .update({
                            status: 'sent',
                            sent_at: now
                        })
                        .eq('id', notif.id)

                    results.push({ id: notif.id, status: 'sent' })

                } else if (notif.channel === 'push') {
                    // Push notification via Web Push API
                    // TODO: Implementar quando tivermos service worker e VAPID keys

                    console.log(`[Push] Enviando: ${notif.title} - ${notif.message}`)

                    await supabase
                        .from('notifications')
                        .update({
                            status: 'sent',
                            sent_at: now
                        })
                        .eq('id', notif.id)

                    results.push({ id: notif.id, status: 'sent' })

                } else {
                    // Canal não suportado ou telefone não informado
                    await supabase
                        .from('notifications')
                        .update({
                            status: 'failed',
                            error_message: 'Canal não suportado ou telefone não informado'
                        })
                        .eq('id', notif.id)

                    results.push({ id: notif.id, status: 'failed', error: 'unsupported_channel' })
                }
            } catch (err) {
                console.error(`Erro ao processar notificação ${notif.id}:`, err)

                await supabase
                    .from('notifications')
                    .update({
                        status: 'failed',
                        error_message: String(err)
                    })
                    .eq('id', notif.id)

                results.push({ id: notif.id, status: 'failed', error: String(err) })
            }
        }

        // 3. Verificar aniversários (executar uma vez por dia)
        const { error: birthdayError } = await supabase.rpc('check_birthday_notifications')
        if (birthdayError) {
            console.error('Erro ao verificar aniversários:', birthdayError)
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results,
                timestamp: now
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
