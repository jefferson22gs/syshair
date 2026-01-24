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
    FileText,
    Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useSubscription, SubscriptionStatus } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
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

const PLANS = {
    monthly: {
        id: "3bc80db99eec4746a3fa82309737b066",
        price: 39.90,
        period: "mês",
        label: "Mensal",
    },
    annual: {
        id: "3d181e15ab654a5fae79f7f76e7261d3",
        price: 400.00,
        period: "ano",
        label: "Anual",
        discount: 15,
        savings: 78.80,
    }
};

type PlanType = 'monthly' | 'annual';

const SubscriptionManagement = () => {
    const navigate = useNavigate();
    const { subscription, isLoading, checkSubscription } = useSubscription();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');

    const currentPlan = PLANS[selectedPlan];

    // Gera URL de checkout com external_reference para rastreabilidade
    const getCheckoutUrl = (planType: PlanType = selectedPlan) => {
        const planId = PLANS[planType].id;
        const baseUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planId}`;
        if (subscription?.salonId) {
            return `${baseUrl}&external_reference=${subscription.salonId}`;
        }
        return baseUrl;
    };

    const handleSubscribe = async () => {
        // Salvar external_reference no banco antes de redirecionar
        if (subscription?.id && subscription?.salonId) {
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase
                .from('subscriptions')
                .update({ mp_external_reference: subscription.salonId })
                .eq('id', subscription.id);
        }

        // Abrir checkout do Mercado Pago
        window.open(getCheckoutUrl(), '_blank');
    };

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
                                                onClick={handleSubscribe}
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
                                            onClick={handleSubscribe}
                                        >
                                            <CreditCard size={16} className="mr-2" />
                                            Renovar assinatura
                                        </Button>
                                    </motion.div>
                                )}

                                {/* Subscription details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-secondary/30">
                                        <p className="text-sm text-muted-foreground mb-1">Tipo de Plano</p>
                                        <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                                            {subscription?.planType === 'annual' ? (
                                                <>
                                                    <Crown size={18} className="text-primary" />
                                                    Anual
                                                    <Badge className="bg-green-500 text-white text-xs">-15%</Badge>
                                                </>
                                            ) : (
                                                <>
                                                    <Calendar size={18} className="text-primary" />
                                                    Mensal
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-secondary/30">
                                        <p className="text-sm text-muted-foreground mb-1">
                                            {subscription?.planType === 'annual' ? 'Valor anual' : 'Valor mensal'}
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">
                                            R$ {subscription?.amount?.toFixed(2).replace('.', ',') || (subscription?.planType === 'annual' ? '400,00' : '39,90')}
                                        </p>
                                        {subscription?.planType === 'annual' && (
                                            <p className="text-xs text-green-500 mt-1">
                                                Equivale a R$ 33,33/mês
                                            </p>
                                        )}
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

                                    {subscription?.currentPeriodEnd && !subscription?.isTrial && (
                                        <div className="p-4 rounded-xl bg-secondary/30">
                                            <p className="text-sm text-muted-foreground mb-1">
                                                {subscription?.planType === 'annual' ? 'Vencimento da assinatura' : 'Próxima cobrança'}
                                            </p>
                                            <p className="text-lg font-semibold text-foreground">
                                                {subscription.currentPeriodEnd.toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            {subscription?.daysRemaining && subscription.daysRemaining <= 30 && (
                                                <p className="text-xs text-orange-500 mt-1">
                                                    {subscription.daysRemaining} dias restantes
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Plan Selection - Show when trial or not active */}
                                {(subscription?.isTrial || !subscription?.isActive) && (
                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-sm font-medium text-foreground mb-3">Escolha seu plano:</p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <button
                                                onClick={() => setSelectedPlan('monthly')}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 transition-all text-left",
                                                    selectedPlan === 'monthly'
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Calendar size={16} className="text-primary" />
                                                    <span className="font-semibold">Mensal</span>
                                                </div>
                                                <p className="text-xl font-bold text-primary">R$ 39,90</p>
                                                <p className="text-xs text-muted-foreground">/mês</p>
                                            </button>
                                            <button
                                                onClick={() => setSelectedPlan('annual')}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 transition-all text-left relative",
                                                    selectedPlan === 'annual'
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] border-0">
                                                    -15%
                                                </Badge>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Crown size={16} className="text-primary" />
                                                    <span className="font-semibold">Anual</span>
                                                </div>
                                                <p className="text-xl font-bold text-primary">R$ 400,00</p>
                                                <p className="text-xs text-green-500">Economize R$ 78,80</p>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                                    {subscription?.isTrial || !subscription?.isActive ? (
                                        <Button
                                            variant="gold"
                                            className="flex-1"
                                            onClick={handleSubscribe}
                                        >
                                            <CreditCard size={18} className="mr-2" />
                                            Assinar {selectedPlan === 'annual' ? 'Anual' : 'Mensal'}
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
