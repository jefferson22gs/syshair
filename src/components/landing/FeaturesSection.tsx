import { 
  Calendar, 
  Users, 
  Scissors, 
  BarChart3, 
  Bell, 
  Gift,
  Smartphone,
  Shield,
  Clock
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agendamento Inteligente",
    description: "Seus clientes agendam em segundos. Confirmação automática via WhatsApp.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Histórico completo, preferências e perfil de beleza de cada cliente.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Scissors,
    title: "Controle de Profissionais",
    description: "Agenda individual, comissões automáticas e performance em tempo real.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "Dashboard Financeiro",
    description: "Faturamento, ticket médio e serviços mais vendidos em um só lugar.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Bell,
    title: "Automações Inteligentes",
    description: "Lembretes automáticos e sugestões de retorno para fidelizar clientes.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: Gift,
    title: "Cupons & Promoções",
    description: "Crie cupons personalizados para horários ociosos e novos clientes.",
    gradient: "from-pink-500 to-rose-500",
  },
];

const highlights = [
  { icon: Smartphone, text: "100% Mobile" },
  { icon: Shield, text: "Dados Seguros" },
  { icon: Clock, text: "Setup em 5min" },
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-surface-1" />
      
      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa em{' '}
            <span className="text-gradient-gold">um só lugar</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Funcionalidades pensadas para transformar a gestão do seu salão
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-8">
          {highlights.map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
