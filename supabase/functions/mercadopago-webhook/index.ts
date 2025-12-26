// Mercado Pago Webhook Handler - Supabase Edge Function
// This function receives webhooks from Mercado Pago and updates subscription status automatically

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MPWebhookPayload {
    action: string;
    api_version: string;
    data: {
        id: string;
    };
    date_created: string;
    id: number;
    live_mode: boolean;
    type: 'subscription_preapproval' | 'payment' | 'subscription_authorized_payment';
    user_id: string;
}

interface MPPreapproval {
    id: string;
    payer_id: number;
    payer_email: string;
    status: 'pending' | 'authorized' | 'paused' | 'cancelled';
    external_reference: string;
    next_payment_date: string;
    auto_recurring: {
        transaction_amount: number;
        currency_id: string;
    };
}

interface MPPayment {
    id: number;
    status: 'approved' | 'pending' | 'rejected' | 'refunded' | 'cancelled';
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    date_approved: string;
    external_reference: string;
    payment_method_id: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;

        // Initialize Supabase client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse webhook payload
        const payload: MPWebhookPayload = await req.json();
        console.log('Webhook received:', payload.type, payload.data.id);

        // Handle different webhook types
        switch (payload.type) {
            case 'subscription_preapproval': {
                // Fetch preapproval from Mercado Pago
                const preapprovalResponse = await fetch(
                    `https://api.mercadopago.com/preapproval/${payload.data.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${mpAccessToken}`,
                        },
                    }
                );

                if (!preapprovalResponse.ok) {
                    console.error('Failed to fetch preapproval:', preapprovalResponse.status);
                    break;
                }

                const preapproval: MPPreapproval = await preapprovalResponse.json();
                console.log('Preapproval status:', preapproval.status);

                // Map MP status to our status
                const statusMap: Record<string, string> = {
                    'authorized': 'active',
                    'pending': 'pending',
                    'paused': 'pending',
                    'cancelled': 'cancelled',
                };

                const status = statusMap[preapproval.status] || 'pending';

                // Find subscription by external reference (salon_id)
                const { data: subscription, error: findError } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .or(`mp_preapproval_id.eq.${preapproval.id},mp_external_reference.eq.${preapproval.external_reference}`)
                    .limit(1)
                    .maybeSingle();

                if (!subscription) {
                    console.log('No subscription found for preapproval:', preapproval.id);
                    break;
                }

                // Calculate period dates
                const now = new Date();
                const periodEnd = new Date(preapproval.next_payment_date || now);
                if (!preapproval.next_payment_date) {
                    periodEnd.setMonth(periodEnd.getMonth() + 1);
                }

                // Update subscription - LIBERA O SISTEMA!
                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({
                        status,
                        is_trial: false,
                        mp_preapproval_id: preapproval.id,
                        mp_payer_id: preapproval.payer_id.toString(),
                        current_period_start: now.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        next_payment_date: periodEnd.toISOString(),
                        amount: preapproval.auto_recurring?.transaction_amount || 39.90,
                        updated_at: now.toISOString(),
                    })
                    .eq('id', subscription.id);

                if (updateError) {
                    console.error('Error updating subscription:', updateError);
                } else {
                    console.log('✅ Subscription ACTIVATED:', subscription.id, '- Status:', status);
                }
                break;
            }

            case 'payment':
            case 'subscription_authorized_payment': {
                // Fetch payment from Mercado Pago
                const paymentResponse = await fetch(
                    `https://api.mercadopago.com/v1/payments/${payload.data.id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${mpAccessToken}`,
                        },
                    }
                );

                if (!paymentResponse.ok) {
                    console.error('Failed to fetch payment:', paymentResponse.status);
                    break;
                }

                const payment: MPPayment = await paymentResponse.json();
                console.log('Payment status:', payment.status, '- Amount:', payment.transaction_amount);

                // Find subscription by external reference
                if (!payment.external_reference) {
                    console.log('No external reference in payment');
                    break;
                }

                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('id, salon_id')
                    .eq('mp_external_reference', payment.external_reference)
                    .maybeSingle();

                if (!subscription) {
                    console.log('No subscription found for payment:', payment.external_reference);
                    break;
                }

                // Record payment
                await supabase
                    .from('subscription_payments')
                    .insert({
                        subscription_id: subscription.id,
                        salon_id: subscription.salon_id,
                        mp_payment_id: payment.id.toString(),
                        mp_status: payment.status,
                        mp_status_detail: payment.status_detail,
                        amount: payment.transaction_amount,
                        currency: payment.currency_id,
                        payment_method: payment.payment_method_id,
                        paid_at: payment.date_approved,
                    });

                // Update subscription based on payment status
                if (payment.status === 'approved') {
                    const periodEnd = new Date();
                    periodEnd.setMonth(periodEnd.getMonth() + 1);

                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'active',
                            is_trial: false,
                            last_payment_date: payment.date_approved,
                            current_period_end: periodEnd.toISOString(),
                            next_payment_date: periodEnd.toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', subscription.id);

                    console.log('✅ Payment APPROVED - Subscription activated:', subscription.id);
                } else if (payment.status === 'rejected') {
                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'pending',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', subscription.id);

                    console.log('❌ Payment REJECTED - Subscription pending:', subscription.id);
                }
                break;
            }

            default:
                console.log('Unhandled webhook type:', payload.type);
        }

        return new Response(
            JSON.stringify({ success: true }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        );
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
