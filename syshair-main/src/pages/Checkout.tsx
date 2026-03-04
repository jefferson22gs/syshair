import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    CreditCard,
    Check,
    Shield,
    Zap,
    Crown,
    Gift,
    Clock,
    ArrowRight,
    Sparkles,
    ExternalLink,
    Calendar,
    Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/icons/Logo";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Mercado Pago Subscription Plan IDs
const PLANS = {
    monthly: {
        id: "3bc80db99eec4746a3fa82309737b066",
        price: 39.90,
        originalPrice: 99.90,
        period: "mês",
        label: "Mensal",
        description: "Cobrança mensal recorrente",
    },
    annual: {
        id: "3d181e15ab654a5fae79f7f76e7261d3",
        price: 400.00,
        originalPrice: 478.80, // 39.90 * 12
        period: "ano",
        label: "Anual",
        description: "Economia de R$ 78,80",
        discount: 15,
    }
};

const planFeatures = [
    "✓ Agendamento online ilimitado",
    "✓ Gestão de clientes (CRM)",
    "✓ Controle financeiro completo",
    "✓ Profissionais ilimitados",
    "✓ Dashboard de analytics",
    "✓ Integração WhatsApp",
    "✓ App PWA personalizado",
    "✓ Suporte prioritário",
    "✓ Sem taxas adicionais",
    "✓ Atualizações gratuitas",
];

type PlanType = 'monthly' | 'annual';

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');

    const currentPlan = PLANS[selectedPlan];
    const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${currentPlan.id}`;

    // Load Mercado Pago script for modal functionality
    useEffect(() => {
        const loadMercadoPagoScript = () => {
            if ((window as any).$MPC_loaded !== true) {
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.async = true;
                script.src = "https://secure.mlstatic.com/mptools/render.js";
                const firstScript = document.getElementsByTagName('script')[0];
                firstScript.parentNode?.insertBefore(script, firstScript);
                (window as any).$MPC_loaded = true;
            }
        };

        if ((window as any).$MPC_loaded !== true) {
            window.addEventListener('load', loadMercadoPagoScript, false);
        }

        // Listen for Mercado Pago callback messages
        const handleMPMessage = (event: MessageEvent) => {
            // Handle callback when subscription is completed
            if (event.data && event.data.preapproval_id) {
                console.log('Subscription created:', event.data.preapproval_id);
                // Redirect to success page or admin
                navigate('/admin?subscription=success');
            }
        };

        window.addEventListener("message", handleMPMessage);
        return () => window.removeEventListener("message", handleMPMessage);
    }, [navigate]);

    const handleSubscribe = () => {
        // Open Mercado Pago checkout in new tab/modal
        window.open(checkoutUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
                        <Logo size="sm" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Pagamento seguro via Mercado Pago</span>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
                            <Gift size={14} className="mr-1" />
                            21 dias GRÁTIS para testar!
                        </Badge>
                        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Comece a transformar <br />
                            <span className="text-gradient-gold">seu salão hoje</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Assine o SysHair Premium e tenha acesso a todas as funcionalidades
                            para gerenciar seu salão de forma profissional.
                        </p>
                    </motion.div>

                    {/* Plan Selector */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="inline-flex items-center gap-2 p-1.5 bg-card/80 rounded-xl border border-border/50 backdrop-blur-sm">
                            <button
                                onClick={() => setSelectedPlan('monthly')}
                                className={cn(
                                    "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                                    selectedPlan === 'monthly'
                                        ? "bg-primary text-primary-foreground shadow-lg"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Calendar className="w-4 h-4 inline mr-2" />
                                Mensal
                            </button>
                            <button
                                onClick={() => setSelectedPlan('annual')}
                                className={cn(
                                    "px-6 py-3 rounded-lg font-medium transition-all duration-200 relative",
                                    selectedPlan === 'annual'
                                        ? "bg-primary text-primary-foreground shadow-lg"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Crown className="w-4 h-4 inline mr-2" />
                                Anual
                                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 border-0">
                                    -15%
                                </Badge>
                            </button>
                        </div>
                    </motion.div>

                    {/* Plan Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        key={selectedPlan}
                    >
                        <Card className="glass-card overflow-hidden max-w-2xl mx-auto">
                            {/* Plan Header */}
                            <div className="bg-gradient-to-r from-primary to-gold-light p-8 text-primary-foreground text-center relative overflow-hidden">
                                {/* Sparkles Animation */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {[...Array(5)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0.3 }}
                                            animate={{
                                                opacity: [0.3, 0.6, 0.3],
                                                y: [-10, -30, -10],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                delay: i * 0.5,
                                            }}
                                            className="absolute"
                                            style={{ left: `${20 + i * 15}%`, bottom: '20%' }}
                                        >
                                            <Sparkles className="w-4 h-4 text-white/40" />
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="relative z-10">
                                    <Badge className="bg-white/20 text-white border-white/30 mb-3">
                                        <Crown size={12} className="mr-1" />
                                        {selectedPlan === 'annual' ? 'Melhor Custo-Benefício' : 'Plano Único - Tudo Incluso'}
                                    </Badge>
                                    <h2 className="font-display text-3xl font-bold mb-2">SysHair Premium</h2>

                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-white/60 text-lg line-through">
                                            R$ {currentPlan.originalPrice.toFixed(2).replace('.', ',')}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-bold">
                                                R$ {currentPlan.price.toFixed(2).replace('.', ',')}
                                            </span>
                                            <span className="text-white/80">/{currentPlan.period}</span>
                                        </div>
                                    </div>

                                    {selectedPlan === 'annual' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mt-3"
                                        >
                                            <Badge className="bg-green-500/30 text-white border-green-400/50">
                                                <Percent size={12} className="mr-1" />
                                                Economia de R$ 78,80 por ano!
                                            </Badge>
                                        </motion.div>
                                    )}

                                    <p className="text-white/70 mt-2 text-sm">
                                        {selectedPlan === 'annual'
                                            ? 'Pagamento único anual • Renovação automática'
                                            : 'Cancele quando quiser • Sem fidelidade'
                                        }
                                    </p>
                                </div>
                            </div>

                            <CardContent className="p-8">
                                {/* Features Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                                    {planFeatures.map((feature, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.05 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <span className="text-sm text-foreground">{feature.substring(2)}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Trial Info */}
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Gift className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-400">21 dias GRÁTIS!</p>
                                            <p className="text-sm text-green-300/70">
                                                Experimente sem compromisso. Primeira cobrança só após o período de teste.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Annual benefit highlight */}
                                {selectedPlan === 'annual' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                                <Crown className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-primary">Vantagem do Plano Anual</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Pague R$ 33,33/mês em vez de R$ 39,90. Sem preocupações por 12 meses!
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Mercado Pago Subscribe Button */}
                                <a
                                    href={checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full"
                                    data-mp-button="true"
                                >
                                    <Button
                                        variant="gold"
                                        size="lg"
                                        className="w-full text-lg py-6"
                                    >
                                        <CreditCard size={20} className="mr-2" />
                                        Assinar {selectedPlan === 'annual' ? 'Anual' : 'Mensal'} com Mercado Pago
                                        <ExternalLink size={16} className="ml-2" />
                                    </Button>
                                </a>

                                {/* Secondary Button */}
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full mt-3"
                                    onClick={handleSubscribe}
                                >
                                    Abrir em nova janela
                                </Button>

                                {/* Guarantees */}
                                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/50">
                                    <div className="text-center">
                                        <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">Cancele quando quiser</p>
                                    </div>
                                    <div className="text-center">
                                        <Shield className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">Pagamento 100% seguro</p>
                                    </div>
                                    <div className="text-center">
                                        <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground">Ativação instantânea</p>
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-border/50">
                                    <img
                                        src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/badge/mercado-pago-badge.png"
                                        alt="Mercado Pago"
                                        className="h-8"
                                    />
                                    <div className="h-6 w-px bg-border" />
                                    <div className="flex items-center gap-2">
                                        <img src="https://logospng.org/download/visa/logo-visa-1024.png" alt="Visa" className="h-4" />
                                        <img src="https://logospng.org/download/mastercard/logo-mastercard-1024.png" alt="Mastercard" className="h-6" />
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Pix_logo.svg" alt="Pix" className="h-5" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Plan Comparison - Mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8 p-4 rounded-xl bg-card/50 border border-border/50 max-w-2xl mx-auto"
                    >
                        <h3 className="text-center font-semibold mb-4">Comparativo de Planos</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className={cn(
                                "p-4 rounded-lg border-2 transition-all",
                                selectedPlan === 'monthly' ? "border-primary bg-primary/5" : "border-border"
                            )}>
                                <p className="font-semibold">Mensal</p>
                                <p className="text-2xl font-bold text-primary">R$ 39,90</p>
                                <p className="text-muted-foreground text-xs">por mês</p>
                                <p className="mt-2 text-xs text-muted-foreground">Total anual: R$ 478,80</p>
                            </div>
                            <div className={cn(
                                "p-4 rounded-lg border-2 transition-all relative",
                                selectedPlan === 'annual' ? "border-primary bg-primary/5" : "border-border"
                            )}>
                                <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] border-0">
                                    ECONOMIA
                                </Badge>
                                <p className="font-semibold">Anual</p>
                                <p className="text-2xl font-bold text-primary">R$ 400,00</p>
                                <p className="text-muted-foreground text-xs">por ano</p>
                                <p className="mt-2 text-xs text-green-500 font-medium">Economia de R$ 78,80</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* FAQ Link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center mt-8"
                    >
                        <p className="text-sm text-muted-foreground">
                            Dúvidas sobre a assinatura?{" "}
                            <button
                                onClick={() => navigate('/#faq')}
                                className="text-primary hover:underline"
                            >
                                Veja nosso FAQ
                            </button>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
