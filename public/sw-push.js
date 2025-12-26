// Custom Service Worker for Push Notifications
// SysHair - BelezaTech

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

// IMPORTANTE: Evento de Push Notification
self.addEventListener('push', (event) => {
    console.log('📱 Push recebido:', event);

    // Dados padrão caso não tenha payload
    let data = {
        title: 'SysHair',
        body: 'Você tem uma nova notificação!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: '/'
    };

    try {
        if (event.data) {
            const payload = event.data.text();
            console.log('📦 Payload recebido:', payload);

            // Tentar parsear como JSON
            try {
                const parsed = JSON.parse(payload);
                data = { ...data, ...parsed };
            } catch (e) {
                // Se não for JSON, usar o texto como body
                if (payload && payload.length > 0) {
                    data.body = payload;
                }
            }
        }
    } catch (e) {
        console.error('Erro ao processar push:', e);
    }

    const options = {
        body: data.body || data.message || 'Nova notificação',
        icon: data.icon || '/pwa-192x192.png',
        badge: data.badge || '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            ...data
        },
        actions: [
            { action: 'open', title: '🔔 Abrir' },
            { action: 'close', title: '❌ Fechar' }
        ],
        tag: 'syshair-notification-' + Date.now(),
        renotify: true,
        requireInteraction: true
    };

    console.log('📣 Mostrando notificação:', data.title, options);

    event.waitUntil(
        self.registration.showNotification(data.title || 'SysHair', options)
    );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notificação clicada:', event.action);

    // Fechar a notificação
    event.notification.close();

    // Se clicou em fechar, não fazer nada
    if (event.action === 'close') {
        return;
    }

    // URL para abrir
    const urlToOpen = event.notification.data?.url || '/';
    const fullUrl = new URL(urlToOpen, self.location.origin).href;

    console.log('🔗 Abrindo URL:', fullUrl);

    // Abrir ou focar na janela
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                console.log('📱 Janelas encontradas:', clientList.length);

                // Se já tem uma janela aberta do site, focar nela
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        console.log('✅ Focando janela existente');
                        client.navigate(fullUrl);
                        return client.focus();
                    }
                }

                // Senão, abrir nova janela
                console.log('🆕 Abrindo nova janela:', fullUrl);
                if (clients.openWindow) {
                    return clients.openWindow(fullUrl);
                }
            })
            .catch(err => {
                console.error('❌ Erro ao abrir janela:', err);
            })
    );
});

// Evento de fechamento de notificação
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notificação fechada');
});

// Evento fetch para cache básico
self.addEventListener('fetch', (event) => {
    // Deixar o navegador lidar com as requisições normalmente
    // Não interceptamos para simplificar
});
