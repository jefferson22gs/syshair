import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Crown,
    CreditCard,
    Calendar,
    Clock,
    AlertTriangle,
    Check,
    X,
    RefreshCw,
    ExternalLink,
    Gift,
    Shield,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useSubscription, SubscriptionStatus } from "@/hooks/useSubscription";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<SubscriptionStatus, { label: string; color: string; icon: any }> = {
    trial: { label: 'Período de Teste', color: 'bg-blue-500', icon: Gift },
    active: { label: 'Ativa', color: 'bg-green-500', icon: Check },
    pending: { label: 'Pagamento Pendente', color: 'bg-yellow-500', icon: Clock },
    cancelled: { label: 'Cancelada', color: 'bg-gray-500', icon: X },
    expired: { label: 'Expirada', color: 'bg-red-500', icon: AlertTriangle },
    blocked: { label: 'Bloqueada', color: 'bg-red-600', icon: AlertTriangle },
    none: { label: 'Sem Assinatura', color: 'bg-gray-400', icon: X },
};

const MERCADO_PAGO_PLAN_ID = "3bc80db99eec4746a3fa82309737b066";
const MERCADO_PAGO_CHECKOUT_URL = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${MERCADO_PAGO_PLAN_ID}`;

const SubscriptionManagement = () => {
    const navigate = useNavigate();
    const { subscription, isLoading, checkSubscription } = useSubscription();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await checkSubscription();
        setIsRefreshing(false);
    };

    const handleCancelSubscription = async () => {
        // In production, this would call Mercado Pago API to cancel
        alert('Funcionalidade de cancelamento será implementada com a integração completa do Mercado Pago.');
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    const status = subscription?.status || 'none';
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-foreground">
                            Minha Assinatura
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie sua assinatura do SysHair Premium
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Atualizar status
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Subscription Card */}
                    <div className="lg:col-span-2">
                        <Card className="glass-card overflow-hidden">
                            <div className="bg-gradient-to-r from-primary to-gold-light p-6 text-primary-foreground">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Crown size={32} />
                                        <div>
                                            <h2 className="text-xl font-bold">{subscription?.planName || 'SysHair Premium'}</h2>
                                            <p className="text-white/80 text-sm">Plano Único - Tudo Incluso</p>
                                        </div>
                                    </div>
                                    <Badge className={`${config.color} text-white`}>
                                        <StatusIcon size={14} className="mr-1" />
                                        {config.label}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                {/* Trial info */}
                                {subscription?.isTrial && subscription?.isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Gift className="w-8 h-8 text-blue-500" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-blue-400">Período de Teste Gratuito</p>
                                                <p className="text-sm text-blue-300/70">
                                                    {subscription.daysRemaining > 0
                                                        ? `Restam ${subscription.daysRemaining} dia${subscription.daysRemaining > 1 ? 's' : ''} de teste`
                                                        : 'Seu período de teste expira hoje!'
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-400">{subscription.daysRemaining}</p>
                                                <p className="text-xs text-blue-300/70">dias restantes</p>
                                            </div>
                                        </div>

                                        {subscription.daysRemaining <= 3 && (
                                            <Button
                                                variant="gold"
                                                size="sm"
                                                className="w-full mt-4"
                                                onClick={() => window.open(MERCADO_PAGO_CHECKOUT_URL, '_blank')}
                                            >
                                                <CreditCard size={16} className="mr-2" />
                                                Assinar agora para não perder acesso
                                            </Button>
                                        )}
                                    </motion.div>
                                )}

                                {/* Expired/Blocked warning */}
                                {!subscription?.isActive && subscription?.status !== 'none' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-8 h-8 text-red-500" />
                                            <div>
                                                <p className="font-semibold text-red-400">Assinatura Inativa</p>
                                                <p className="text-sm text-red-300/70">
                                                    Seu acesso está limitado. Renove para continuar usando todas as funcionalidades.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="gold"
                                            size="sm"
                                            className="w-full mt-4"
                                            onClick={() => window.open(MERCADO_PAGO_CHECKOUT_URL, '_blank')}
                                        >
                                            <CreditCard size={16} className="mr-2" />
                                            Renovar assinatura
                                        </Button>
                                    </motion.div>
                                )}

                                {/* Subscription details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-secondary/30">
                                        <p className="text-sm text-muted-foreground mb-1">Valor mensal</p>
                                        <p className="text-2xl font-bold text-foreground">
                                            R$ {subscription?.amount?.toFixed(2) || '39,90'}
                                        </p>
                                    </div>

                                    {subscription?.trialEndDate && subscription?.isTrial && (
                                        <div className="p-4 rounded-xl bg-secondary/30">
                                            <p className="text-sm text-muted-foreground mb-1">Fim do período de teste</p>
                                            <p className="text-lg font-semibold text-foreground">
                                                {subscription.trialEndDate.toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    )}

                                    {subscription?.nextPaymentDate && !subscription?.isTrial && (
                                        <div className="p-4 rounded-xl bg-secondary/30">
                                            <p className="text-sm text-muted-foreground mb-1">Próxima cobrança</p>
                                            <p className="text-lg font-semibold text-foreground">
                                                {subscription.nextPaymentDate.toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                                    {subscription?.isTrial || !subscription?.isActive ? (
                                        <Button
                                            variant="gold"
                                            className="flex-1"
                                            onClick={() => window.open(MERCADO_PAGO_CHECKOUT_URL, '_blank')}
                                        >
                                            <CreditCard size={18} className="mr-2" />
                                            Assinar com Mercado Pago
                                            <ExternalLink size={14} className="ml-2" />
                                        </Button>
                                    ) : (
                                        <a
                                            href="https://www.mercadopago.com.br/subscriptions"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1"
                                        >
                                            <Button variant="outline" className="w-full">
                                                <FileText size={18} className="mr-2" />
                                                Gerenciar no Mercado Pago
                                                <ExternalLink size={14} className="ml-2" />
                                            </Button>
                                        </a>
                                    )}

                                    {subscription?.isActive && !subscription?.isTrial && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                                    Cancelar assinatura
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Ao cancelar sua assinatura, você perderá acesso a todas as funcionalidades
                                                        do SysHair Premium no final do período atual. Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={handleCancelSubscription}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        Sim, cancelar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Features included */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    O que está incluso
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    'Agendamento ilimitado',
                                    'Gestão de clientes',
                                    'Dashboard financeiro',
                                    'Integração WhatsApp',
                                    'Profissionais ilimitados',
                                    'Relatórios e Analytics',
                                    'App PWA personalizado',
                                    'Suporte prioritário',
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Check size={16} className="text-green-500" />
                                        <span className="text-sm text-foreground">{feature}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Help */}
                        <Card className="glass-card">
                            <CardContent className="p-6 text-center">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Dúvidas sobre sua assinatura?
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('https://wa.me/5511986262240?text=Olá! Tenho uma dúvida sobre minha assinatura do SysHair.', '_blank')}
                                >
                                    Falar com Código Base
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SubscriptionManagement;
