// Serviço para Fila de Espera

import { supabase } from '@/integrations/supabase/client';

export interface WaitlistItem {
    id: string;
    salon_id: string;
    client_id: string | null;
    client_name: string;
    client_phone: string;
    service_id: string | null;
    professional_id: string | null;
    preferred_date: string | null;
    preferred_time_start: string | null;
    preferred_time_end: string | null;
    notes: string | null;
    status: 'waiting' | 'notified' | 'scheduled' | 'cancelled' | 'expired';
    priority: number;
    notified_at: string | null;
    scheduled_at: string | null;
    created_at: string;
    // Relacionamentos
    service?: { id: string; name: string };
    professional?: { id: string; name: string };
    client?: { id: string; name: string; phone: string };
}

export const waitlistService = {
    // Buscar lista de espera
    async getWaitlist(salonId: string, status?: string): Promise<WaitlistItem[]> {
        let query = supabase
            .from('waitlist')
            .select(`
        *,
        service:services(id, name),
        professional:professionals(id, name),
        client:clients(id, name, phone)
      `)
            .eq('salon_id', salonId)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        } else {
            query = query.in('status', ['waiting', 'notified']);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as WaitlistItem[]) || [];
    },

    // Adicionar à fila de espera
    async addToWaitlist(item: {
        salon_id: string;
        client_id?: string;
        client_name: string;
        client_phone: string;
        service_id?: string;
        professional_id?: string;
        preferred_date?: string;
        preferred_time_start?: string;
        preferred_time_end?: string;
        notes?: string;
        priority?: number;
    }): Promise<WaitlistItem> {
        const { data, error } = await supabase
            .from('waitlist')
            .insert({
                ...item,
                status: 'waiting',
                priority: item.priority || 0
            })
            .select()
            .single();

        if (error) throw error;
        return data as WaitlistItem;
    },

    // Atualizar status
    async updateStatus(
        id: string,
        status: WaitlistItem['status'],
        additionalData?: { scheduled_at?: string; notified_at?: string }
    ): Promise<void> {
        const updateData: any = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status === 'notified') {
            updateData.notified_at = new Date().toISOString();
        }
        if (status === 'scheduled' && additionalData?.scheduled_at) {
            updateData.scheduled_at = additionalData.scheduled_at;
        }

        const { error } = await supabase
            .from('waitlist')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
    },

    // Atualizar prioridade
    async updatePriority(id: string, priority: number): Promise<void> {
        const { error } = await supabase
            .from('waitlist')
            .update({ priority, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    // Remover da fila
    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('waitlist')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Estatísticas
    async getStats(salonId: string): Promise<{
        waiting: number;
        notified: number;
        scheduledToday: number;
        averageWaitTime: number;
    }> {
        const { data: waitingData } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId)
            .eq('status', 'waiting');

        const { data: notifiedData } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId)
            .eq('status', 'notified');

        const today = new Date().toISOString().split('T')[0];
        const { data: scheduledData } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId)
            .eq('status', 'scheduled')
            .gte('scheduled_at', today);

        return {
            waiting: (waitingData as any)?.length || 0,
            notified: (notifiedData as any)?.length || 0,
            scheduledToday: (scheduledData as any)?.length || 0,
            averageWaitTime: 0 // TODO: calcular baseado em histórico
        };
    }
};
