import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    X,
    Check,
    Calendar,
    DollarSign,
    Star,
    AlertTriangle,
    MessageCircle,
    UserPlus,
    Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: string;
    type: 'appointment' | 'payment' | 'review' | 'alert' | 'message' | 'client' | 'promo';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
}

// Mock notifications - replace with real data from Supabase
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'appointment',
        title: 'Novo agendamento!',
        message: 'Maria Silva agendou Corte + Escova para hoje às 15:00',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
        actionUrl: '/admin/appointments'
    },
    {
        id: '2',
        type: 'payment',
        title: 'Pagamento recebido',
        message: 'R$ 150,00 recebido de João Santos via PIX',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
    },
    {
        id: '3',
        type: 'review',
        title: 'Nova avaliação ⭐⭐⭐⭐⭐',
        message: 'Ana Oliveira avaliou o serviço com 5 estrelas',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        actionUrl: '/admin/reviews'
    },
    {
        id: '4',
        type: 'alert',
        title: 'Estoque baixo',
        message: 'Produto "Shampoo Keratina 500ml" está com apenas 2 unidades',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: true,
        actionUrl: '/admin/products'
    },
    {
        id: '5',
        type: 'client',
        title: 'Novo cliente cadastrado',
        message: 'Pedro Costa se cadastrou pelo link de agendamento',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read: true,
        actionUrl: '/admin/clients'
    },
    {
        id: '6',
        type: 'promo',
        title: 'Cupom utilizado',
        message: 'Cupom PRIMEIRAVISITA foi usado por Carla Mendes',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        read: true,
    },
];

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'appointment': return <Calendar className="w-5 h-5 text-blue-500" />;
        case 'payment': return <DollarSign className="w-5 h-5 text-green-500" />;
        case 'review': return <Star className="w-5 h-5 text-yellow-500" />;
        case 'alert': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
        case 'message': return <MessageCircle className="w-5 h-5 text-purple-500" />;
        case 'client': return <UserPlus className="w-5 h-5 text-cyan-500" />;
        case 'promo': return <Gift className="w-5 h-5 text-pink-500" />;
        default: return <Bell className="w-5 h-5 text-primary" />;
    }
};

const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-background border-l border-border shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="w-6 h-6 text-primary" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <h2 className="font-display text-xl font-bold">Notificações</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                                        <Check size={16} className="mr-1" />
                                        Marcar todas
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={onClose}>
                                    <X size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <ScrollArea className="h-[calc(100vh-80px)]">
                            <div className="p-4 space-y-3">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">Nenhuma notificação</p>
                                    </div>
                                ) : (
                                    notifications.map((notification, index) => (
                                        <motion.div
                                            key={notification.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group shadow-md ${notification.read
                                                ? 'bg-muted border-border'
                                                : 'bg-primary/20 border-primary/60 hover:border-primary'
                                                }`}
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            {/* Unread Indicator */}
                                            {!notification.read && (
                                                <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />
                                            )}

                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0 border border-border shadow-sm">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground">{notification.title}</p>
                                                    <p className="text-sm text-foreground/90 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {formatTimestamp(notification.timestamp)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/20 text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <X size={12} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Bell Button for Header
export const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(true);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="relative w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
                <Bell size={20} />
                {hasUnread && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-3 h-3 bg-destructive rounded-full border-2 border-card"
                    />
                )}
            </button>
            <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
};
