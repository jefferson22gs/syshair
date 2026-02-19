import { useState } from "react";
import { Check, Sparkles, Crown, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const features = [
  "Profissionais ilimitados",
  "Agendamentos ilimitados",
  "Dashboard completo",
  "Lembretes por WhatsApp",
  "Cupons de desconto",
  "Gestão de clientes",
  "Relatórios financeiros",
  "Suporte prioritário",
];

type PlanType = 'monthly' | 'annual';

const plans = {
  monthly: {
    price: "39",
    cents: "90",
    period: "mês",
    total: null,
  },
  annual: {
    price: "400",
    cents: "00",
    period: "ano",
    total: "R$ 33,33/mês",
    savings: "78,80",
  },
};

export const PricingSection = () => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const currentPlan = plans[selectedPlan];

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-surface-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Um preço,{' '}
            <span className="text-gradient-gold">tudo incluso</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Sem surpresas, sem taxas extras. Tudo que você precisa por um preço único.
          </p>
        </div>

        {/* Plan Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 p-1.5 bg-card/80 rounded-xl border border-border/50 backdrop-blur-sm">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all duration-200",
                selectedPlan === 'monthly'
                  ? "bg-gradient-to-r from-primary to-gold-light text-primary-foreground shadow-lg"
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
                  ? "bg-gradient-to-r from-primary to-gold-light text-primary-foreground shadow-lg"
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
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-lg mx-auto">
          <div
            className="relative glass-card rounded-3xl p-10 border-primary/50 shadow-gold animate-fade-in-up"
          >
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-gold-light text-primary-foreground text-sm font-medium">
                <Crown size={14} />
                {selectedPlan === 'annual' ? 'Melhor Custo-Benefício' : 'Acesso Completo'}
              </div>
            </div>

            {/* Plan Name */}
            <div className="text-center mb-8">
              <h3 className="font-display text-3xl font-bold text-foreground mb-2">
                {selectedPlan === 'annual' ? 'Plano Anual' : 'Plano Mensal'}
              </h3>
              <p className="text-muted-foreground">
                Todas as funcionalidades liberadas
              </p>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl text-muted-foreground">R$</span>
                <span className="text-7xl font-bold text-foreground">{currentPlan.price}</span>
                <span className="text-3xl font-bold text-foreground">,{currentPlan.cents}</span>
              </div>
              <span className="text-muted-foreground">/{currentPlan.period}</span>

              {selectedPlan === 'annual' && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Percent size={12} className="mr-1" />
                    Economia de R$ {plans.annual.savings}/ano
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Equivale a {plans.annual.total}
                  </p>
                </div>
              )}
            </div>

            {/* Features */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Link to="/checkout">
              <Button
                variant="gold"
                className="w-full"
                size="lg"
              >
                Começar agora — 21 dias grátis
              </Button>
            </Link>

            {/* No credit card */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Cancele quando quiser • Sem fidelidade
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-lg mx-auto mt-8 p-4 rounded-xl bg-card/50 border border-border/50">
          <h4 className="text-center font-semibold mb-4">Comparativo</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={cn(
              "p-4 rounded-lg border-2 transition-all cursor-pointer",
              selectedPlan === 'monthly' ? "border-primary bg-primary/5" : "border-border"
            )} onClick={() => setSelectedPlan('monthly')}>
              <p className="font-semibold">Mensal</p>
              <p className="text-2xl font-bold text-primary">R$ 39,90</p>
              <p className="text-muted-foreground text-xs">por mês</p>
            </div>
            <div className={cn(
              "p-4 rounded-lg border-2 transition-all cursor-pointer relative",
              selectedPlan === 'annual' ? "border-primary bg-primary/5" : "border-border"
            )} onClick={() => setSelectedPlan('annual')}>
              <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] border-0">
                ECONOMIA
              </Badge>
              <p className="font-semibold">Anual</p>
              <p className="text-2xl font-bold text-primary">R$ 400,00</p>
              <p className="text-green-500 text-xs font-medium">Economize R$ 78,80</p>
            </div>
          </div>
        </div>

        {/* Money Back */}
        <p className="text-center text-muted-foreground mt-12">
          ✨ Garantia de 30 dias ou seu dinheiro de volta
        </p>
      </div>
    </section>
  );
};
