// Custom Service Worker for Push Notifications

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

    let data = {
        title: 'SysHair',
        body: 'Você tem uma nova notificação!',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
    };

    try {
        if (event.data) {
            const payload = event.data.text();
            console.log('📦 Payload recebido:', payload);

            // Tentar parsear como JSON
            try {
                data = JSON.parse(payload);
            } catch (e) {
                // Se não for JSON, usar o texto como body
                data.body = payload;
            }
        }
    } catch (e) {
        console.error('Erro ao processar push:', e);
    }

    const options = {
        body: data.body || 'Nova notificação',
        icon: data.icon || '/pwa-192x192.png',
        badge: data.badge || '/pwa-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Fechar' }
        ],
        tag: 'syshair-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SysHair', options)
    );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notificação clicada:', event.action);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Abrir ou focar na janela
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Se já tem uma janela aberta, focar nela
                for (const client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                // Senão, abrir nova janela
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Evento de fechamento de notificação
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notificação fechada');
});

// Importar workbox para cache (se disponível)
try {
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

    if (workbox) {
        console.log('Workbox carregado');

        // Precache
        workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

        // Cache de fontes
        workbox.routing.registerRoute(
            /^https:\/\/fonts\.googleapis\.com\/.*/i,
            new workbox.strategies.CacheFirst({
                cacheName: 'google-fonts-cache',
                plugins: [
                    new workbox.expiration.ExpirationPlugin({
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 365
                    })
                ]
            })
        );
    }
} catch (e) {
    console.log('Workbox não disponível, usando apenas push');
}
