import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4">
        <div className="relative max-w-4xl mx-auto">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-gold-light/20 to-primary/20 rounded-3xl blur-3xl" />
          
          {/* Card */}
          <div className="relative glass-card rounded-3xl p-12 md:p-16 text-center border-primary/20">
            {/* Decorative Elements */}
            <div className="absolute top-4 left-4 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-primary/10 rounded-full blur-xl" />
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-medium text-primary">Comece sua transformação digital</span>
            </div>

            {/* Heading */}
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Pronto para revolucionar{' '}
              <br className="hidden md:block" />
              <span className="text-gradient-gold">seu salão?</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Junte-se a mais de 2.500 salões que já transformaram sua gestão com o SysHair. 
              Teste grátis por 14 dias, sem cartão de crédito.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="gold" size="xl" className="group">
                Começar agora
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glass" size="xl">
                Agendar demonstração
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <span>✓ Setup em 5 minutos</span>
              <span>✓ Sem taxa de adesão</span>
              <span>✓ Suporte incluído</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
