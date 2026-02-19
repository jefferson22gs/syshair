import { Crown, Scissors, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const profiles = [
  {
    icon: Crown,
    title: "Para Donos de Salão",
    role: "Admin",
    description: "Controle total do seu negócio. Dashboard completo, gestão financeira, equipe e muito mais.",
    features: [
      "Dashboard com métricas em tempo real",
      "Gestão de profissionais e comissões",
      "Controle financeiro completo",
      "Cupons e promoções",
      "Relatórios detalhados",
    ],
    gradient: "from-primary via-gold-light to-primary",
    delay: "0s",
  },
  {
    icon: Scissors,
    title: "Para Profissionais",
    role: "Barbeiro / Cabeleireiro",
    description: "Visualize sua agenda, histórico de clientes e acompanhe suas comissões de forma simples.",
    features: [
      "Agenda pessoal organizada",
      "Histórico completo do cliente",
      "Visualização de comissões",
      "Atendimento rápido",
      "Notificações em tempo real",
    ],
    gradient: "from-blue-500 to-cyan-500",
    delay: "0.1s",
  },
  {
    icon: User,
    title: "Para Clientes",
    role: "Experiência Premium",
    description: "Agende em segundos, receba lembretes e tenha um perfil de beleza personalizado.",
    features: [
      "Agendamento em 30 segundos",
      "Escolha de profissional",
      "Cupons de desconto",
      "Lembretes automáticos",
      "Histórico de cortes",
    ],
    gradient: "from-purple-500 to-pink-500",
    delay: "0.2s",
  },
];

export const ProfilesSection = () => {
  return (
    <section id="about" className="py-24 relative">
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Uma experiência para{' '}
            <span className="text-gradient-gold">cada perfil</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Interfaces personalizadas para cada tipo de usuário
          </p>
        </div>

        {/* Profiles Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {profiles.map((profile) => (
            <div
              key={profile.title}
              className="group relative glass-card rounded-3xl p-8 hover:border-primary/30 transition-all duration-500 animate-fade-in-up"
              style={{ animationDelay: profile.delay }}
            >
              {/* Gradient Top Border */}
              <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${profile.gradient} rounded-full`} />

              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${profile.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <profile.icon className="w-8 h-8 text-white" />
              </div>

              {/* Role Badge */}
              <div className="inline-flex px-3 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground mb-4">
                {profile.role}
              </div>

              {/* Content */}
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                {profile.title}
              </h3>
              <p className="text-muted-foreground mb-6">
                {profile.description}
              </p>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {profile.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${profile.gradient}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link to="/checkout">
                <Button variant="gold-outline" className="w-full">
                  Saiba mais
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
