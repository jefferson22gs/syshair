import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeNotification {
  id: string;
  type: 'appointment' | 'broadcast' | 'review' | 'payment' | 'system';
  title: string;
  message: string;
  data?: any;
  created_at: string;
}

export const useRealtimeNotifications = (salonId?: string) => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!salonId) return;

    console.log('🔔 Iniciando notificações em tempo real para salon:', salonId);

    // Criar canal de notificações
    const notificationChannel = supabase.channel(`salon-notifications-${salonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `salon_id=eq.${salonId}`
        },
        (payload) => {
          console.log('📅 Novo agendamento:', payload);

          const notification: RealtimeNotification = {
            id: payload.new.id,
            type: 'appointment',
            title: '🎉 Novo Agendamento!',
            message: `Cliente ${payload.new.client_name || 'Novo cliente'} agendou um horário`,
            data: payload.new,
            created_at: new Date().toISOString()
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Mostrar toast
          toast.success(notification.title, {
            description: notification.message,
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => {
                window.location.href = '/admin/appointments';
              }
            }
          });

          // Notificação nativa do navegador
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `appointment-${payload.new.id}`,
              requireInteraction: true
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcasts',
          filter: `salon_id=eq.${salonId}`
        },
        (payload) => {
          console.log('📤 Atualização de disparo:', payload);

          // Notificar apenas quando status mudar para completed ou stopped
          if (payload.new.status === 'completed' || payload.new.status === 'stopped') {
            const notification: RealtimeNotification = {
              id: payload.new.id,
              type: 'broadcast',
              title: payload.new.status === 'completed' ? '✅ Disparo Concluído!' : '⏸️ Disparo Parado',
              message: `${payload.new.sent_count || 0} mensagens enviadas, ${payload.new.failed_count || 0} falhas`,
              data: payload.new,
              created_at: new Date().toISOString()
            };

            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            toast.info(notification.title, {
              description: notification.message,
              duration: 8000,
              action: {
                label: 'Ver Detalhes',
                onClick: () => {
                  window.location.href = '/admin/whatsapp';
                }
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `salon_id=eq.${salonId}`
        },
        (payload) => {
          console.log('⭐ Nova avaliação:', payload);

          const notification: RealtimeNotification = {
            id: payload.new.id,
            type: 'review',
            title: '⭐ Nova Avaliação!',
            message: `${payload.new.rating} estrelas - ${payload.new.comment?.substring(0, 50) || 'Sem comentário'}`,
            data: payload.new,
            created_at: new Date().toISOString()
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.success(notification.title, {
            description: notification.message,
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => {
                window.location.href = '/admin/reviews';
              }
            }
          });

          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `review-${payload.new.id}`,
              requireInteraction: true
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `salon_id=eq.${salonId}`
        },
        (payload) => {
          console.log('💰 Novo pagamento:', payload);

          const notification: RealtimeNotification = {
            id: payload.new.id,
            type: 'payment',
            title: '💰 Pagamento Recebido!',
            message: `R$ ${payload.new.amount?.toFixed(2)} - ${payload.new.payment_method || 'Método não especificado'}`,
            data: payload.new,
            created_at: new Date().toISOString()
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          toast.success(notification.title, {
            description: notification.message,
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => {
                window.location.href = '/admin/financial';
              }
            }
          });

          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `payment-${payload.new.id}`,
              requireInteraction: true
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status do canal de notificações:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao canal de notificações em tempo real!');
        }
      });

    setChannel(notificationChannel);

    // Cleanup
    return () => {
      console.log('🔔 Desconectando canal de notificações');
      notificationChannel.unsubscribe();
    };
  }, [salonId]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected: channel?.state === 'joined'
  };
};
