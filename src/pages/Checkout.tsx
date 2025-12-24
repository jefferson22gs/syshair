import { useEffect } from "react";
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
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/icons/Logo";
import { useNavigate } from "react-router-dom";

// Mercado Pago Subscription Plan ID
const MERCADO_PAGO_PLAN_ID = "3bc80db99eec4746a3fa82309737b066";
const MERCADO_PAGO_CHECKOUT_URL = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${MERCADO_PAGO_PLAN_ID}`;

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

export const CheckoutPage = () => {
    const navigate = useNavigate();

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
        window.open(MERCADO_PAGO_CHECKOUT_URL, '_blank');
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
                            7 dias GRÁTIS para testar!
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

                    {/* Plan Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
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
                                        Plano Único - Tudo Incluso
                                    </Badge>
                                    <h2 className="font-display text-3xl font-bold mb-2">SysHair Premium</h2>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-white/60 text-lg line-through">R$ 99,90</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-bold">R$ 39,90</span>
                                            <span className="text-white/80">/mês</span>
                                        </div>
                                    </div>
                                    <p className="text-white/70 mt-2 text-sm">
                                        Cancele quando quiser • Sem fidelidade
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
                                            <p className="font-semibold text-green-400">7 dias GRÁTIS!</p>
                                            <p className="text-sm text-green-300/70">
                                                Experimente sem compromisso. Primeira cobrança só após o período de teste.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mercado Pago Subscribe Button */}
                                <a
                                    href={MERCADO_PAGO_CHECKOUT_URL}
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
                                        Assinar agora com Mercado Pago
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
