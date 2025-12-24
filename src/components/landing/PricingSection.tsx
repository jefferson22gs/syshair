import { Check, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-surface-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Um preço,{' '}
            <span className="text-gradient-gold">tudo incluso</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Sem surpresas, sem taxas extras. Tudo que você precisa por um preço único.
          </p>
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
                Acesso Completo
              </div>
            </div>

            {/* Plan Name */}
            <div className="text-center mb-8">
              <h3 className="font-display text-3xl font-bold text-foreground mb-2">
                Plano Único
              </h3>
              <p className="text-muted-foreground">
                Todas as funcionalidades liberadas
              </p>
            </div>

            {/* Price */}
            <div className="text-center mb-10">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl text-muted-foreground">R$</span>
                <span className="text-7xl font-bold text-foreground">39</span>
                <span className="text-3xl font-bold text-foreground">,90</span>
              </div>
              <span className="text-muted-foreground">/mês</span>
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
                Começar agora — 7 dias grátis
              </Button>
            </Link>

            {/* No credit card */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Cancele quando quiser • Sem fidelidade
            </p>
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
