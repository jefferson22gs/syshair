// Firebase Messaging Service Worker
// Este arquivo DEVE estar na pasta public e se chamar firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
    apiKey: "AIzaSyBigBQRToUU6VCdouRynVx9kPJ65-uROEw",
    authDomain: "belezatech-infinite.firebaseapp.com",
    projectId: "belezatech-infinite",
    storageBucket: "belezatech-infinite.firebasestorage.app",
    messagingSenderId: "133324833961",
    appId: "1:133324833961:web:2d0792f0e4d72b127495b8"
});

const messaging = firebase.messaging();

// Listener para mensagens em background
messaging.onBackgroundMessage((payload) => {
    console.log('📱 Mensagem recebida em background:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'SysHair';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Você tem uma nova notificação!',
        icon: payload.notification?.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        actions: [
            { action: 'open', title: '🔔 Abrir' },
            { action: 'close', title: '❌ Fechar' }
        ],
        tag: 'syshair-fcm-' + Date.now(),
        renotify: true,
        requireInteraction: true
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener para clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notificação FCM clicada:', event);
    event.notification.close();

    if (event.action === 'close') return;

    // URL para abrir
    let urlToOpen = '/';
    if (event.notification.data) {
        if (event.notification.data.url) {
            urlToOpen = event.notification.data.url;
        } else if (event.notification.data.appointment_id) {
            urlToOpen = '/avaliar/' + event.notification.data.appointment_id;
        }
    }

    const fullUrl = new URL(urlToOpen, self.location.origin).href;

    event.waitUntil(
        clients.openWindow(fullUrl).catch(err => {
            console.error('Erro ao abrir janela:', err);
        })
    );
});

console.log('✅ Firebase Messaging Service Worker carregado');
