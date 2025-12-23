import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalonInsights } from "@/components/admin/SalonInsights";
import { ClientMetricsCard } from "@/components/admin/ClientMetricsCard";
import { 
  Calendar, 
  DollarSign, 
  UserCheck, 
  Clock,
  TrendingUp,
  Plus,
  Users,
  Scissors,
  Gift,
  AlertCircle
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Appointment = Tables<"appointments">;

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasSalon, setHasSalon] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    monthRevenue: 0,
    activeClients: 0,
    idleHours: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Check if user has a salon
      const { data: salon } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!salon) {
        setHasSalon(false);
        setLoading(false);
        return;
      }

      setHasSalon(true);
      setSalonId(salon.id);

      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Fetch today's appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          services:service_id (name, duration_minutes),
          professionals:professional_id (name)
        `)
        .eq('salon_id', salon.id)
        .eq('date', today)
        .order('start_time');

      setTodayAppointments(appointments || []);

      // Count today's appointments
      const todayCount = appointments?.length || 0;

      // Calculate month revenue
      const { data: monthAppointments } = await supabase
        .from('appointments')
        .select('final_price')
        .eq('salon_id', salon.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth);

      const monthRevenue = monthAppointments?.reduce((sum, apt) => sum + (apt.final_price || 0), 0) || 0;

      // Count active clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon.id);

      setStats({
        todayAppointments: todayCount,
        monthRevenue: monthRevenue,
        activeClients: clientsCount || 0,
        idleHours: 0, // TODO: Calculate based on working hours
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

  const statsCards = [
    { 
      icon: Calendar, 
      label: "Agendamentos hoje", 
      value: stats.todayAppointments.toString(), 
      change: todayAppointments.length > 0 ? `${todayAppointments.filter(a => a.status === 'confirmed').length} confirmados` : "Nenhum",
      positive: true,
      color: "from-blue-500 to-cyan-500"
    },
    { 
      icon: DollarSign, 
      label: "Faturamento do mês", 
      value: `R$ ${stats.monthRevenue.toFixed(2)}`, 
      change: "+0%",
      positive: true,
      color: "from-green-500 to-emerald-500"
    },
    { 
      icon: UserCheck, 
      label: "Clientes cadastrados", 
      value: stats.activeClients.toString(), 
      change: "Total",
      positive: true,
      color: "from-purple-500 to-pink-500"
    },
    { 
      icon: Clock, 
      label: "Próximo horário", 
      value: todayAppointments.length > 0 ? todayAppointments[0]?.start_time?.slice(0, 5) : "-", 
      change: todayAppointments.length > 0 ? todayAppointments[0]?.services?.name : "Sem agenda",
      positive: true,
      color: "from-orange-500 to-red-500"
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Bem-vindo de volta, {displayName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {hasSalon ? "Acompanhe o desempenho do seu salão" : "Configure seu salão para começar"}
          </p>
        </div>

        {/* Welcome Card for New Users */}
        {!hasSalon && (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <AlertCircle size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Bem-vindo ao SysHair! 🎉
                    </h2>
                    <p className="text-muted-foreground">
                      Configure seu salão para começar a usar todas as funcionalidades
                    </p>
                  </div>
                </div>
                <Button variant="gold" size="lg" onClick={() => navigate('/admin/settings')}>
                  <Plus size={18} className="mr-2" />
                  Configurar meu salão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agendamentos de hoje</CardTitle>
                <Button variant="gold-outline" size="sm" onClick={() => navigate('/admin/appointments')}>
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!hasSalon ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar size={48} className="text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Configure seu salão para ver agendamentos
                  </p>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar size={48} className="text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nenhum agendamento para hoje
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Os agendamentos aparecerão aqui quando forem criados
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 5).map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold">
                          {appointment.start_time?.slice(0, 5)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {appointment.client_name || 'Cliente'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.services?.name} • {appointment.professionals?.name}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        appointment.status === 'confirmed' 
                          ? 'bg-success/20 text-success'
                          : appointment.status === 'completed'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-warning/20 text-warning'
                      }`}>
                        {appointment.status === 'confirmed' ? 'Confirmado' 
                          : appointment.status === 'completed' ? 'Concluído'
                          : appointment.status === 'pending' ? 'Pendente'
                          : appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          {salonId && <SalonInsights salonId={salonId} />}
        </div>

        {/* Second Row - Client Metrics & Quick Actions */}
        {salonId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientMetricsCard salonId={salonId} />
            
            {/* Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Ações rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="gold" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin/appointments')}
                >
                  <Calendar size={18} />
                  Novo agendamento
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin/clients')}
                >
                  <Users size={18} />
                  Ver clientes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin/analytics')}
                >
                  <TrendingUp size={18} />
                  Dashboard Analítico
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin/packages')}
                >
                  <Gift size={18} />
                  Gerenciar pacotes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin/products')}
                >
                  <Scissors size={18} />
                  Produtos
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!salonId && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-foreground mb-2">💡 Dica</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Configure seu salão para liberar todas as funcionalidades
                </p>
                <Button 
                  variant="gold" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate('/admin/settings')}
                >
                  Configurar salão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
