import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  Gift, 
  Settings, 
  Bell,
  ChevronDown,
  TrendingUp,
  Clock,
  UserCheck,
  AlertCircle,
  Menu,
  X,
  LogOut,
  Plus
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Agendamentos", badge: 12 },
  { icon: Users, label: "Clientes" },
  { icon: Scissors, label: "Profissionais" },
  { icon: DollarSign, label: "Financeiro" },
  { icon: Gift, label: "Cupons" },
  { icon: Settings, label: "Configurações" },
];

const stats = [
  { 
    icon: Calendar, 
    label: "Agendamentos hoje", 
    value: "0", 
    change: "Novo",
    positive: true,
    color: "from-blue-500 to-cyan-500"
  },
  { 
    icon: DollarSign, 
    label: "Faturamento do mês", 
    value: "R$ 0", 
    change: "Início",
    positive: true,
    color: "from-green-500 to-emerald-500"
  },
  { 
    icon: UserCheck, 
    label: "Clientes ativos", 
    value: "0", 
    change: "Novo",
    positive: true,
    color: "from-purple-500 to-pink-500"
  },
  { 
    icon: Clock, 
    label: "Horários ociosos", 
    value: "-", 
    change: "Configure",
    positive: true,
    color: "from-orange-500 to-red-500"
  },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSalon = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      setHasSalon(!!data);
    };

    checkSalon();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Logo size="sm" />
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-sidebar-foreground hover:text-sidebar-primary"
            >
              <X size={20} />
            </button>
          </div>

          {/* Salon Selector */}
          <div className="p-4">
            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-medium text-sidebar-foreground text-sm truncate max-w-[120px]">
                    {hasSalon === false ? 'Criar Salão' : displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Administrador' : 'Cliente'}
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <button className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                    ${item.active 
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                  `}>
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`
                        text-xs font-medium px-2 py-0.5 rounded-full
                        ${item.active ? 'bg-sidebar-primary-foreground/20' : 'bg-primary text-primary-foreground'}
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-foreground"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Bem-vindo de volta, {displayName}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
                <Bell size={20} className="text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {/* Welcome Card for New Users */}
          {hasSalon === false && (
            <div className="mb-8 p-6 rounded-2xl glass-card border-primary/20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    Bem-vindo ao SysHair! 🎉
                  </h2>
                  <p className="text-muted-foreground">
                    Configure seu salão para começar a usar todas as funcionalidades do sistema.
                  </p>
                </div>
                <Button variant="gold" size="lg">
                  <Plus size={18} className="mr-2" />
                  Configurar meu salão
                </Button>
              </div>
            </div>
          )}

          {/* Alerts */}
          {hasSalon === false && (
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-primary/10 border-primary/20">
                <AlertCircle size={20} className="text-primary" />
                <p className="text-sm text-foreground">
                  Complete a configuração do seu salão para liberar todas as funcionalidades
                </p>
                <Button variant="ghost" size="sm" className="ml-auto">
                  Configurar
                </Button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={24} className="text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                    <TrendingUp size={14} />
                    {stat.change}
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Appointments */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-foreground">Agendamentos de hoje</h2>
                <Button variant="gold-outline" size="sm">Ver todos</Button>
              </div>

              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum agendamento para hoje
                </p>
                {hasSalon === false && (
                  <p className="text-sm text-muted-foreground">
                    Configure seu salão para começar a receber agendamentos
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-6">Ações rápidas</h2>
              
              <div className="space-y-3">
                <Button variant="gold" className="w-full justify-start gap-3">
                  <Calendar size={18} />
                  Novo agendamento
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Users size={18} />
                  Cadastrar cliente
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Gift size={18} />
                  Criar cupom
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Scissors size={18} />
                  Adicionar serviço
                </Button>
              </div>

              {/* Suggestion Card */}
              <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-foreground mb-2">💡 Dica</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {hasSalon === false 
                    ? 'Configure seu salão para começar a usar o sistema completo'
                    : 'Adicione seus serviços e profissionais para começar a receber agendamentos'
                  }
                </p>
                <Button variant="gold" size="sm" className="w-full">
                  {hasSalon === false ? 'Configurar salão' : 'Adicionar serviço'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
