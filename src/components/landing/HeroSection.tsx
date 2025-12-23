import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/Logo";
import { Calendar, ChevronRight, Sparkles, Users, Zap } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-surface-1" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium text-primary">A revolução digital do seu salão</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Seu salão merece uma{' '}
            <span className="text-gradient-gold">gestão premium</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Automatize agendamentos, fidelize clientes e aumente seu faturamento com o sistema mais completo para barbearias e salões de beleza.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="gold" size="xl" className="group">
              Começar agora
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glass" size="xl">
              Ver demonstração
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">+50%</div>
              <div className="text-sm text-muted-foreground">Redução de faltas</div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">2.500+</div>
              <div className="text-sm text-muted-foreground">Salões ativos</div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">30 seg</div>
              <div className="text-sm text-muted-foreground">Tempo de agendamento</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
    </section>
  );
};
