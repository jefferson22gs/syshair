// Serviços para Programa de Fidelidade

import { supabase } from '@/integrations/supabase/client';

export interface LoyaltySettings {
    id: string;
    salon_id: string;
    points_per_real: number;
    points_per_referral: number;
    points_per_review: number;
    birthday_multiplier: number;
    is_active: boolean;
}

export interface LoyaltyTier {
    id: string;
    salon_id: string;
    name: string;
    min_points: number;
    discount_percent: number;
    benefits: string[];
    icon: string;
    color: string;
    sort_order: number;
}

export interface LoyaltyPoints {
    id: string;
    salon_id: string;
    client_id: string;
    points: number;
    lifetime_points: number;
    current_tier_id: string | null;
    current_tier?: LoyaltyTier;
}

export interface LoyaltyTransaction {
    id: string;
    salon_id: string;
    client_id: string;
    type: 'earned' | 'redeemed' | 'expired' | 'bonus';
    points: number;
    description: string;
    reference_id?: string;
    reference_type?: string;
    created_at: string;
}

export interface LoyaltyReward {
    id: string;
    salon_id: string;
    name: string;
    description: string;
    points_required: number;
    type: 'discount' | 'service' | 'product' | 'gift';
    value: number;
    is_active: boolean;
    stock: number | null;
}

export const loyaltyService = {
    // Configurações
    async getSettings(salonId: string): Promise<LoyaltySettings | null> {
        const { data, error } = await supabase
            .from('loyalty_settings')
            .select('*')
            .eq('salon_id', salonId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as LoyaltySettings | null;
    },

    async updateSettings(salonId: string, settings: Partial<LoyaltySettings>): Promise<void> {
        const { error } = await supabase
            .from('loyalty_settings')
            .upsert({ salon_id: salonId, ...settings, updated_at: new Date().toISOString() });

        if (error) throw error;
    },

    // Níveis
    async getTiers(salonId: string): Promise<LoyaltyTier[]> {
        const { data, error } = await supabase
            .from('loyalty_tiers')
            .select('*')
            .eq('salon_id', salonId)
            .order('min_points', { ascending: true });

        if (error) throw error;
        return (data as LoyaltyTier[]) || [];
    },

    // Pontos do cliente
    async getClientPoints(salonId: string, clientId: string): Promise<LoyaltyPoints | null> {
        const { data, error } = await supabase
            .from('loyalty_points')
            .select('*, current_tier:loyalty_tiers(*)')
            .eq('salon_id', salonId)
            .eq('client_id', clientId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as LoyaltyPoints | null;
    },

    async getAllClientsPoints(salonId: string): Promise<LoyaltyPoints[]> {
        const { data, error } = await supabase
            .from('loyalty_points')
            .select('*, current_tier:loyalty_tiers(*)')
            .eq('salon_id', salonId)
            .order('points', { ascending: false });

        if (error) throw error;
        return (data as LoyaltyPoints[]) || [];
    },

    // Adicionar pontos
    async addPoints(
        salonId: string,
        clientId: string,
        points: number,
        description: string,
        referenceId?: string,
        referenceType?: string
    ): Promise<void> {
        // Buscar ou criar registro de pontos
        let clientPoints = await this.getClientPoints(salonId, clientId);

        if (!clientPoints) {
            const { error: insertError } = await supabase
                .from('loyalty_points')
                .insert({
                    salon_id: salonId,
                    client_id: clientId,
                    points: 0,
                    lifetime_points: 0
                });
            if (insertError) throw insertError;
            clientPoints = { id: '', salon_id: salonId, client_id: clientId, points: 0, lifetime_points: 0, current_tier_id: null };
        }

        // Atualizar pontos
        const newPoints = (clientPoints.points || 0) + points;
        const newLifetimePoints = (clientPoints.lifetime_points || 0) + (points > 0 ? points : 0);

        // Determinar novo nível
        const tiers = await this.getTiers(salonId);
        const newTier = tiers.reverse().find(t => newPoints >= t.min_points);

        const { error: updateError } = await supabase
            .from('loyalty_points')
            .update({
                points: newPoints,
                lifetime_points: newLifetimePoints,
                current_tier_id: newTier?.id || null,
                updated_at: new Date().toISOString()
            })
            .eq('salon_id', salonId)
            .eq('client_id', clientId);

        if (updateError) throw updateError;

        // Registrar transação
        const { error: transError } = await supabase
            .from('loyalty_transactions')
            .insert({
                salon_id: salonId,
                client_id: clientId,
                type: points > 0 ? 'earned' : 'redeemed',
                points: Math.abs(points),
                description,
                reference_id: referenceId,
                reference_type: referenceType
            });

        if (transError) throw transError;
    },

    // Transações
    async getTransactions(salonId: string, clientId?: string, limit = 50): Promise<LoyaltyTransaction[]> {
        let query = supabase
            .from('loyalty_transactions')
            .select('*')
            .eq('salon_id', salonId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as LoyaltyTransaction[]) || [];
    },

    // Recompensas
    async getRewards(salonId: string): Promise<LoyaltyReward[]> {
        const { data, error } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('salon_id', salonId)
            .eq('is_active', true)
            .order('points_required', { ascending: true });

        if (error) throw error;
        return (data as LoyaltyReward[]) || [];
    },

    async createReward(reward: Omit<LoyaltyReward, 'id'>): Promise<LoyaltyReward> {
        const { data, error } = await supabase
            .from('loyalty_rewards')
            .insert(reward)
            .select()
            .single();

        if (error) throw error;
        return data as LoyaltyReward;
    },

    // Resgatar recompensa
    async redeemReward(salonId: string, clientId: string, rewardId: string): Promise<void> {
        const reward = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (reward.error) throw reward.error;

        const rewardData = reward.data as LoyaltyReward;

        // Verificar pontos suficientes
        const clientPoints = await this.getClientPoints(salonId, clientId);
        if (!clientPoints || clientPoints.points < rewardData.points_required) {
            throw new Error('Pontos insuficientes para resgatar esta recompensa');
        }

        // Deduzir pontos
        await this.addPoints(
            salonId,
            clientId,
            -rewardData.points_required,
            `Resgate: ${rewardData.name}`,
            rewardId,
            'reward'
        );

        // Registrar resgate
        const { error } = await supabase
            .from('loyalty_redemptions')
            .insert({
                salon_id: salonId,
                client_id: clientId,
                reward_id: rewardId,
                points_used: rewardData.points_required,
                status: 'pending'
            });

        if (error) throw error;
    },

    // Estatísticas
    async getStats(salonId: string): Promise<{
        activeClients: number;
        totalPointsDistributed: number;
        redemptionsThisMonth: number;
        totalValueRedeemed: number;
    }> {
        // Clientes com pontos
        const { count: activeClients } = await supabase
            .from('loyalty_points')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId)
            .gt('points', 0);

        // Total de pontos distribuídos
        const { data: pointsData } = await supabase
            .from('loyalty_transactions')
            .select('points')
            .eq('salon_id', salonId)
            .eq('type', 'earned');

        const totalPointsDistributed = pointsData?.reduce((sum, t) => sum + (t.points || 0), 0) || 0;

        // Resgates no mês
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: redemptionsThisMonth } = await supabase
            .from('loyalty_redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId)
            .gte('created_at', startOfMonth.toISOString());

        // Valor resgatado
        const { data: redemptionsData } = await supabase
            .from('loyalty_redemptions')
            .select('points_used')
            .eq('salon_id', salonId);

        // Aproximando: 100 pontos = R$ 10
        const totalValueRedeemed = (redemptionsData?.reduce((sum, r) => sum + (r.points_used || 0), 0) || 0) / 10;

        return {
            activeClients: activeClients || 0,
            totalPointsDistributed,
            redemptionsThisMonth: redemptionsThisMonth || 0,
            totalValueRedeemed
        };
    }
};
