// Serviço para Programa de Indicações

import { supabase } from '@/integrations/supabase/client';

export interface ReferralSettings {
    id: string;
    salon_id: string;
    is_active: boolean;
    referrer_reward_type: 'points' | 'discount' | 'credit';
    referrer_reward_value: number;
    referee_reward_type: 'points' | 'discount' | 'credit';
    referee_reward_value: number;
    min_purchase_for_reward: number;
}

export interface ReferralCode {
    id: string;
    salon_id: string;
    client_id: string;
    code: string;
    uses_count: number;
    is_active: boolean;
    created_at: string;
    client?: { id: string; name: string };
}

export interface Referral {
    id: string;
    salon_id: string;
    referrer_id: string;
    referee_id: string;
    code_id: string;
    status: 'pending' | 'completed' | 'rewarded' | 'cancelled';
    referrer_rewarded_at: string | null;
    referee_rewarded_at: string | null;
    created_at: string;
    referrer?: { id: string; name: string };
    referee?: { id: string; name: string };
}

export const referralService = {
    // Configurações
    async getSettings(salonId: string): Promise<ReferralSettings | null> {
        const { data, error } = await supabase
            .from('referral_settings')
            .select('*')
            .eq('salon_id', salonId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as ReferralSettings | null;
    },

    async updateSettings(salonId: string, settings: Partial<ReferralSettings>): Promise<void> {
        const { error } = await supabase
            .from('referral_settings')
            .upsert({ salon_id: salonId, ...settings, updated_at: new Date().toISOString() });

        if (error) throw error;
    },

    // Códigos de indicação
    async getClientCode(salonId: string, clientId: string): Promise<ReferralCode | null> {
        const { data, error } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('salon_id', salonId)
            .eq('client_id', clientId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as ReferralCode | null;
    },

    async generateCode(salonId: string, clientId: string): Promise<ReferralCode> {
        // Gerar código único baseado no nome do cliente
        const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single();

        const baseName = (clientData?.name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const code = `${baseName}${random}`;

        const { data, error } = await supabase
            .from('referral_codes')
            .insert({
                salon_id: salonId,
                client_id: clientId,
                code,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return data as ReferralCode;
    },

    async getOrCreateCode(salonId: string, clientId: string): Promise<ReferralCode> {
        let code = await this.getClientCode(salonId, clientId);
        if (!code) {
            code = await this.generateCode(salonId, clientId);
        }
        return code;
    },

    // Validar e usar código
    async validateCode(salonId: string, code: string): Promise<ReferralCode | null> {
        const { data, error } = await supabase
            .from('referral_codes')
            .select('*, client:clients(id, name)')
            .eq('salon_id', salonId)
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error) return null;
        return data as ReferralCode | null;
    },

    async useCode(salonId: string, code: string, newClientId: string): Promise<Referral> {
        const codeData = await this.validateCode(salonId, code);
        if (!codeData) {
            throw new Error('Código inválido ou expirado');
        }

        if (codeData.client_id === newClientId) {
            throw new Error('Você não pode usar seu próprio código');
        }

        // Verificar se já usou algum código
        const { data: existingRef } = await supabase
            .from('referrals')
            .select('id')
            .eq('salon_id', salonId)
            .eq('referee_id', newClientId)
            .single();

        if (existingRef) {
            throw new Error('Você já utilizou um código de indicação');
        }

        // Criar indicação
        const { data, error } = await supabase
            .from('referrals')
            .insert({
                salon_id: salonId,
                referrer_id: codeData.client_id,
                referee_id: newClientId,
                code_id: codeData.id,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Incrementar contador de usos
        await supabase
            .from('referral_codes')
            .update({ uses_count: (codeData.uses_count || 0) + 1 })
            .eq('id', codeData.id);

        return data as Referral;
    },

    // Listar indicações
    async getReferrals(salonId: string, clientId?: string): Promise<Referral[]> {
        let query = supabase
            .from('referrals')
            .select(`
        *,
        referrer:clients!referrer_id(id, name),
        referee:clients!referee_id(id, name)
      `)
            .eq('salon_id', salonId)
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('referrer_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as Referral[]) || [];
    },

    // Recompensar indicação
    async rewardReferral(referralId: string): Promise<void> {
        const { error } = await supabase
            .from('referrals')
            .update({
                status: 'rewarded',
                referrer_rewarded_at: new Date().toISOString(),
                referee_rewarded_at: new Date().toISOString()
            })
            .eq('id', referralId);

        if (error) throw error;
    },

    // Estatísticas
    async getStats(salonId: string): Promise<{
        totalReferrals: number;
        pendingReferrals: number;
        completedReferrals: number;
        topReferrers: Array<{ client_id: string; name: string; count: number }>;
    }> {
        const { data: allReferrals } = await supabase
            .from('referrals')
            .select('*, referrer:clients!referrer_id(id, name)')
            .eq('salon_id', salonId);

        const referrals = allReferrals || [];

        // Contar por referrer
        const referrerCounts: { [key: string]: { name: string; count: number } } = {};
        referrals.forEach((r: any) => {
            const id = r.referrer_id;
            if (!referrerCounts[id]) {
                referrerCounts[id] = { name: r.referrer?.name || 'Desconhecido', count: 0 };
            }
            referrerCounts[id].count++;
        });

        const topReferrers = Object.entries(referrerCounts)
            .map(([client_id, data]) => ({ client_id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalReferrals: referrals.length,
            pendingReferrals: referrals.filter((r: any) => r.status === 'pending').length,
            completedReferrals: referrals.filter((r: any) => r.status === 'rewarded').length,
            topReferrers
        };
    }
};
