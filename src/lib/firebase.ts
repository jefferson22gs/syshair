// Firebase Configuration for Push Notifications
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Firebase config from console
const firebaseConfig = {
    apiKey: "AIzaSyBigBQRToUU6VCdouRynVx9kPJ65-uROEw",
    authDomain: "belezatech-infinite.firebaseapp.com",
    projectId: "belezatech-infinite",
    storageBucket: "belezatech-infinite.firebasestorage.app",
    messagingSenderId: "133324833961",
    appId: "1:133324833961:web:2d0792f0e4d72b127495b8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// VAPID Key from Firebase Console -> Cloud Messaging -> Web Push certificates
// Este é o par de chaves que você gerou
const VAPID_KEY = "BN6dAQwKkXyuUwT0xM3S7Q6g-JjENkNg6VtRZmBOY-qkR3vHfKVnxO4B5OgKUEKSEJbFb9645ZPIh-2qIZEqSq4";

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

// Get messaging instance (only in browser that supports it)
export const getMessagingInstance = async () => {
    if (messagingInstance) return messagingInstance;

    const supported = await isSupported();
    if (!supported) {
        console.log("Firebase Messaging não é suportado neste navegador");
        return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
};

// Request permission and get FCM token
export const requestFCMToken = async (): Promise<string | null> => {
    try {
        // Primeiro registrar o Service Worker do Firebase
        let swRegistration: ServiceWorkerRegistration | null = null;

        if ('serviceWorker' in navigator) {
            try {
                // Registrar o SW específico do Firebase Messaging
                swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/'
                });
                console.log('✅ Firebase SW registrado:', swRegistration.scope);

                // Aguardar SW estar ativo
                await navigator.serviceWorker.ready;
            } catch (err) {
                console.error('Erro ao registrar Firebase SW:', err);
            }
        }

        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.log("Permissão de notificação negada");
            return null;
        }

        // Get FCM token com o SW registrado
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration || undefined,
        });

        console.log("✅ FCM Token obtido:", token?.substring(0, 30) + '...');
        return token;
    } catch (error) {
        console.error("Erro ao obter FCM token:", error);
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
    getMessagingInstance().then(messaging => {
        if (messaging) {
            onMessage(messaging, (payload) => {
                console.log("Mensagem recebida em foreground:", payload);
                callback(payload);
            });
        }
    });
};

export { app };
