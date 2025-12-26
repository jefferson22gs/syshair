// Custom Service Worker for Push Notifications
// SysHair - BelezaTech

const SUPABASE_URL = 'https://jfjbpjnnfnuiezchhust.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmamjwam5uZm51aWV6Y2hodXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTc2NDIsImV4cCI6MjA0ODk5MzY0Mn0.pV0gHdIQHpEfyZH8xqUn1OsP5I_HwvH3gxcXmfCVuFA';

// Evento de instalação
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalado');
    self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker ativado');
    event.waitUntil(clients.claim());
});

// Buscar última notificação do banco
async function fetchLatestNotification() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/notifications?order=created_at.desc&limit=1&status=eq.sent`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        });

        if (response.ok) {
            const notifications = await response.json();
            if (notifications && notifications.length > 0) {
                return notifications[0];
            }
        }
    } catch (error) {
        console.error('Erro ao buscar notificação:', error);
    }
    return null;
}

// IMPORTANTE: Evento de Push Notification
self.addEventListener('push', (event) => {
    console.log('📱 Push recebido:', event);

    // Dados padrão
    let notificationData = {
        title: 'SysHair',
        body: 'Você tem uma nova notificação!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: '/'
    };

    // Tentar obter dados do payload primeiro
    try {
        if (event.data) {
            const payload = event.data.text();
            console.log('📦 Payload recebido:', payload);
            if (payload && payload.length > 0) {
                try {
                    const parsed = JSON.parse(payload);
                    notificationData = { ...notificationData, ...parsed };
                } catch (e) {
                    notificationData.body = payload;
                }
            }
        }
    } catch (e) {
        console.log('Sem payload, buscando do banco...');
    }

    // Se não tem payload, buscar do banco
    const showNotification = async () => {
        if (notificationData.body === 'Você tem uma nova notificação!') {
            const dbNotification = await fetchLatestNotification();
            if (dbNotification) {
                notificationData.title = dbNotification.title || 'SysHair';
                notificationData.body = dbNotification.message || dbNotification.body || 'Nova notificação';

                // Parsear metadata se existir
                if (dbNotification.metadata) {
                    try {
                        const meta = typeof dbNotification.metadata === 'string'
                            ? JSON.parse(dbNotification.metadata)
                            : dbNotification.metadata;

                        if (meta.url) notificationData.url = meta.url;
                        if (meta.appointment_id) notificationData.appointment_id = meta.appointment_id;
                        console.log('📥 Metadata:', meta);
                    } catch (e) {
                        console.log('Erro ao parsear metadata:', e);
                    }
                }

                console.log('📥 Notificação do banco:', notificationData);
            }
        }

        const options = {
            body: notificationData.body,
            icon: notificationData.icon || '/pwa-192x192.png',
            badge: notificationData.badge || '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            data: {
                url: notificationData.url || '/',
                ...notificationData
            },
            actions: [
                { action: 'open', title: '🔔 Abrir' },
                { action: 'close', title: '❌ Fechar' }
            ],
            tag: 'syshair-notification-' + Date.now(),
            renotify: true,
            requireInteraction: true
        };

        console.log('📣 Mostrando notificação:', notificationData.title, options.body);
        return self.registration.showNotification(notificationData.title, options);
    };

    event.waitUntil(showNotification());
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notificação clicada:', event.action, event.notification.data);

    // Fechar a notificação
    event.notification.close();

    // Se clicou em fechar, não fazer nada
    if (event.action === 'close') {
        return;
    }

    // URL para abrir - pegar do data ou usar root
    let urlToOpen = '/';

    if (event.notification.data) {
        if (event.notification.data.url) {
            urlToOpen = event.notification.data.url;
        } else if (event.notification.data.appointment_id) {
            urlToOpen = '/avaliar/' + event.notification.data.appointment_id;
        }
    }

    const fullUrl = new URL(urlToOpen, self.location.origin).href;
    console.log('🔗 URL a abrir:', fullUrl);

    // Sempre abrir nova janela para garantir funcionamento
    event.waitUntil(
        clients.openWindow(fullUrl).catch(err => {
            console.error('❌ Erro ao abrir janela:', err);
            // Fallback: tentar abrir qualquer janela existente
            return clients.matchAll({ type: 'window' }).then(windowClients => {
                if (windowClients.length > 0) {
                    return windowClients[0].focus();
                }
            });
        })
    );
});

// Evento de fechamento de notificação
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notificação fechada');
});

// Evento fetch - não interceptar para simplificar
self.addEventListener('fetch', (event) => {
    // Deixar o navegador lidar normalmente
});
