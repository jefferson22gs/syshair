/**
 * Mercado Pago Webhook Handler
 * 
 * This file should be deployed as a Supabase Edge Function or external API
 * to receive webhooks from Mercado Pago and update subscription status.
 * 
 * Webhook URL to configure in Mercado Pago:
 * https://your-project.supabase.co/functions/v1/mercadopago-webhook
 */

import { createClient } from '@supabase/supabase-js';

// Types for Mercado Pago webhook payloads
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
    back_url: string;
    collector_id: number;
    application_id: number;
    status: 'pending' | 'authorized' | 'paused' | 'cancelled';
    reason: string;
    external_reference: string;
    date_created: string;
    last_modified: string;
    init_point: string;
    auto_recurring: {
        frequency: number;
        frequency_type: 'months' | 'days';
        transaction_amount: number;
        currency_id: string;
        start_date: string;
        end_date: string;
    };
    summarized: {
        quotas: number;
        charged_quantity: number;
        pending_charge_quantity: number;
        charged_amount: number;
        pending_charge_amount: number;
        semaphore: string;
        last_charged_date: string;
        last_charged_amount: number;
    };
    next_payment_date: string;
    payment_method_id: string;
    first_invoice_offset: number;
}

interface MPPayment {
    id: number;
    status: 'approved' | 'pending' | 'rejected' | 'refunded' | 'cancelled';
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    date_approved: string;
    date_created: string;
    external_reference: string;
    payment_method_id: string;
    payment_type_id: string;
}

// Environment variables (set these in your Supabase Edge Function secrets)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch subscription details from Mercado Pago API
 */
async function fetchMPPreapproval(preapprovalId: string): Promise<MPPreapproval | null> {
    try {
        const response = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                },
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch preapproval:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching preapproval:', error);
        return null;
    }
}

/**
 * Fetch payment details from Mercado Pago API
 */
async function fetchMPPayment(paymentId: string): Promise<MPPayment | null> {
    try {
        const response = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                },
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch payment:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching payment:', error);
        return null;
    }
}

/**
 * Update subscription status based on Mercado Pago preapproval
 */
async function updateSubscriptionFromPreapproval(preapproval: MPPreapproval) {
    // Map MP status to our status
    const statusMap: Record<string, string> = {
        'authorized': 'active',
        'pending': 'pending',
        'paused': 'pending',
        'cancelled': 'cancelled',
    };

    const status = statusMap[preapproval.status] || 'pending';

    // Find subscription by MP preapproval ID or external reference
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .or(`mp_preapproval_id.eq.${preapproval.id},mp_external_reference.eq.${preapproval.external_reference}`)
        .limit(1)
        .single();

    if (!subscription) {
        console.log('No subscription found for preapproval:', preapproval.id);
        return;
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(preapproval.next_payment_date);

    // Update subscription
    const { error } = await supabase
        .from('subscriptions')
        .update({
            status,
            is_trial: false,
            mp_preapproval_id: preapproval.id,
            mp_payer_id: preapproval.payer_id.toString(),
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            next_payment_date: preapproval.next_payment_date,
            amount: preapproval.auto_recurring.transaction_amount,
            updated_at: now.toISOString(),
        })
        .eq('id', subscription.id);

    if (error) {
        console.error('Error updating subscription:', error);
    } else {
        console.log('Subscription updated successfully:', subscription.id);
    }
}

/**
 * Record payment and update subscription
 */
async function recordPayment(payment: MPPayment, subscriptionId: string) {
    // Insert payment record
    const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
            subscription_id: subscriptionId,
            mp_payment_id: payment.id.toString(),
            mp_status: payment.status,
            mp_status_detail: payment.status_detail,
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            payment_method: payment.payment_method_id,
            paid_at: payment.date_approved,
        });

    if (paymentError) {
        console.error('Error recording payment:', paymentError);
        return;
    }

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
            .eq('id', subscriptionId);
    } else if (payment.status === 'rejected') {
        await supabase
            .from('subscriptions')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);
    }
}

/**
 * Main webhook handler
 * Deploy this as a Supabase Edge Function
 */
export async function handleWebhook(request: Request): Promise<Response> {
    try {
        // Verify request method
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        // Parse webhook payload
        const payload: MPWebhookPayload = await request.json();
        console.log('Webhook received:', payload.type, payload.data.id);

        // Handle different webhook types
        switch (payload.type) {
            case 'subscription_preapproval': {
                // Subscription status changed
                const preapproval = await fetchMPPreapproval(payload.data.id);
                if (preapproval) {
                    await updateSubscriptionFromPreapproval(preapproval);
                }
                break;
            }

            case 'payment':
            case 'subscription_authorized_payment': {
                // Payment received
                const payment = await fetchMPPayment(payload.data.id);
                if (payment && payment.external_reference) {
                    // Find subscription by external reference
                    const { data: subscription } = await supabase
                        .from('subscriptions')
                        .select('id')
                        .eq('mp_external_reference', payment.external_reference)
                        .single();

                    if (subscription) {
                        await recordPayment(payment, subscription.id);
                    }
                }
                break;
            }

            default:
                console.log('Unhandled webhook type:', payload.type);
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

// For Supabase Edge Functions
// Deno.serve(handleWebhook);

// For Node.js/Express
// export default handleWebhook;
