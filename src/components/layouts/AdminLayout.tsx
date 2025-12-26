import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePWA } from "@/hooks/usePWA";
import { NotificationBell } from "@/components/admin/NotificationCenter";
import { ThemeSelector } from "@/components/admin/ThemeSelector";
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton";
import { SubscriptionWarningBanner } from "@/components/subscription/SubscriptionWarningBanner";
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
  Menu,
  X,
  LogOut,
  UserCog,
  ClipboardList,
  BarChart3,
  Package,
  ShoppingBag,
  Star,
  Building2,
  Image,
  Home,
  WifiOff,
  Trophy,
  Clock,
  Share2,
  Brain,
  Crown,
  Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", shortLabel: "Início" },
  { icon: Calendar, label: "Agendamentos", path: "/admin/appointments", shortLabel: "Agenda" },
  { icon: Users, label: "Clientes", path: "/admin/clients", shortLabel: "Clientes" },
  { icon: UserCog, label: "Profissionais", path: "/admin/professionals", shortLabel: "Equipe" },
  { icon: ClipboardList, label: "Serviços", path: "/admin/services", shortLabel: "Serviços" },
  { icon: Gift, label: "Cupons", path: "/admin/coupons", shortLabel: "Cupons" },
  { icon: Package, label: "Pacotes", path: "/admin/packages", shortLabel: "Pacotes" },
  { icon: DollarSign, label: "Financeiro", path: "/admin/financial", shortLabel: "Financeiro" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics", shortLabel: "Analytics" },
  { icon: Brain, label: "Recursos Avançados", path: "/admin/advanced", shortLabel: "Avançado", isNew: true },
  { icon: ShoppingBag, label: "Produtos", path: "/admin/products", shortLabel: "Produtos" },
  { icon: Star, label: "Avaliações", path: "/admin/reviews", shortLabel: "Avaliações" },
  { icon: Image, label: "Galeria", path: "/admin/gallery", shortLabel: "Galeria" },
  { icon: Building2, label: "Multi-Unidades", path: "/admin/multi-units", shortLabel: "Unidades" },
  { icon: Crown, label: "Minha Assinatura", path: "/admin/subscription", shortLabel: "Assinatura" },
  { icon: Megaphone, label: "Marketing", path: "/admin/marketing", shortLabel: "Marketing", isNew: true },
  { icon: Settings, label: "Configurações", path: "/admin/settings", shortLabel: "Config" },
];

// Bottom navigation items (mobile only) - most used features
const bottomNavItems = [
  { icon: Home, label: "Início", path: "/admin" },
  { icon: Calendar, label: "Agenda", path: "/admin/appointments" },
  { icon: Users, label: "Clientes", path: "/admin/clients" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Menu, label: "Menu", path: "menu" },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salonName, setSalonName] = useState<string>("");
  const { user, profile, signOut, isAdmin } = useAuth();
  const { isOnline } = usePWA();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchSalonName();
  }, [user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const fetchSalonName = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('salons')
      .select('name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (data) {
      setSalonName(data.name);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBottomNavClick = (path: string) => {
    if (path === "menu") {
      setSidebarOpen(true);
    } else {
      navigate(path);
    }
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
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50",
        "w-[280px] lg:w-64 bg-sidebar border-r border-sidebar-border",
        "transform transition-transform duration-300 ease-in-out",
        "safe-top safe-bottom",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Logo size="sm" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-sidebar-foreground hover:text-sidebar-primary touch-target"
            >
              <X size={24} />
            </button>
          </div>

          {/* Salon Selector */}
          <div className="p-4">
            <button
              onClick={() => navigate('/admin/settings')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors touch-target"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  {salonName ? salonName.charAt(0).toUpperCase() : displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-medium text-sidebar-foreground text-sm truncate">
                    {salonName || "Configurar Salão"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Administrador
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
            </button>
          </div>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-warning text-sm">
              <WifiOff size={16} />
              <span>Modo offline</span>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto momentum-scroll">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target",
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent/80'
                      )}
                    >
                      <item.icon size={20} className="flex-shrink-0" />
                      <span className="font-medium truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border safe-bottom">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors touch-target"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="sticky-header">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14 lg:h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-foreground touch-target -ml-2"
                aria-label="Abrir menu"
              >
                <Menu size={24} />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeSelector />
              <NotificationBell />
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-gradient-to-br from-primary to-gold-light items-center justify-center text-primary-foreground font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Subscription Warning Banner */}
        <SubscriptionWarningBanner />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const isActive = item.path !== "menu" && location.pathname === item.path;
            const isMenu = item.path === "menu";

            return (
              <button
                key={item.label}
                onClick={() => handleBottomNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] touch-target",
                  isActive ? "text-primary" : "text-muted-foreground",
                  isMenu && sidebarOpen && "text-primary"
                )}
              >
                <item.icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton />
    </div>
  );
};
