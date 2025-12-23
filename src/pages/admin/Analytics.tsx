import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Star,
  AlertTriangle,
  Target,
  Lightbulb
} from "lucide-react";

interface Analytics {
  period: string;
  start_date: string;
  total_revenue: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  cancellation_rate: number;
  new_clients: number;
  avg_ticket: number;
  top_services: Array<{ name: string; count: number; revenue: number }>;
  top_professionals: Array<{ name: string; appointments: number; revenue: number; avg_rating: number | null }>;
  revenue_by_day: Array<{ day_of_week: number; revenue: number; appointments: number }>;
  hourly_distribution: Array<{ hour: number; count: number }>;
}

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const COLORS = ['hsl(43, 74%, 49%)', 'hsl(43, 74%, 65%)', 'hsl(220, 15%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)'];

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchSalonId();
  }, [user]);

  useEffect(() => {
    if (salonId) {
      fetchAnalytics();
    }
  }, [salonId, period]);

  const fetchSalonId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (data) {
      setSalonId(data.id);
    }
  };

  const fetchAnalytics = async () => {
    if (!salonId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_salon_analytics', {
        p_salon_id: salonId,
        p_period: period
      });

      if (error) throw error;
      setAnalytics(data as unknown as Analytics);
      generateSuggestions(data as unknown as Analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = (data: Analytics) => {
    const suggs: string[] = [];
    
    if (data.cancellation_rate > 10) {
      suggs.push("📉 Taxa de cancelamento alta! Considere implementar pagamento antecipado ou lembretes.");
    }
    
    if (data.revenue_by_day && data.revenue_by_day.length > 0) {
      const lowestDay = data.revenue_by_day.reduce((min, d) => 
        d.revenue < min.revenue ? d : min
      );
      suggs.push(`💡 ${dayLabels[lowestDay.day_of_week]} é seu dia com menor faturamento. Crie uma promoção especial!`);
    }
    
    if (data.avg_ticket < 50) {
      suggs.push("💰 Ticket médio baixo. Ofereça combos ou serviços complementares.");
    }
    
    if (data.top_professionals && data.top_professionals.length > 0) {
      const topPro = data.top_professionals[0];
      if (topPro.avg_rating && topPro.avg_rating >= 4.5) {
        suggs.push(`⭐ ${topPro.name} tem excelente avaliação! Destaque na página pública.`);
      }
    }
    
    setSuggestions(suggs);
  };

  const formatRevenueByDay = () => {
    if (!analytics?.revenue_by_day) return [];
    return analytics.revenue_by_day.map(d => ({
      ...d,
      day: dayLabels[d.day_of_week]
    }));
  };

  const formatHourlyData = () => {
    if (!analytics?.hourly_distribution) return [];
    return analytics.hourly_distribution.map(h => ({
      ...h,
      label: `${h.hour}:00`
    }));
  };

  if (loading && !analytics) {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Dashboard Analítico
            </h1>
            <p className="text-muted-foreground">
              Análise completa do desempenho do seu salão
            </p>
          </div>
          
          <div className="flex gap-2">
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'gold' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === 'week' && '7 dias'}
                {p === 'month' && '30 dias'}
                {p === 'quarter' && '90 dias'}
                {p === 'year' && '1 ano'}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(analytics?.total_revenue || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calendar size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {analytics?.total_appointments || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(analytics?.avg_ticket || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {analytics?.new_clients || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Novos Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb size={20} className="text-primary" />
                Sugestões Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{s}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Day */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Faturamento por Dia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={formatRevenueByDay()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis dataKey="day" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220, 18%, 12%)', 
                      border: '1px solid hsl(220, 15%, 18%)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                  />
                  <Bar dataKey="revenue" fill="hsl(43, 74%, 49%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly Distribution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Horário</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={formatHourlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
                  <XAxis dataKey="label" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(220, 18%, 12%)', 
                      border: '1px solid hsl(220, 15%, 18%)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value, 'Agendamentos']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(43, 74%, 49%)" 
                    fill="hsl(43, 74%, 49%)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Top Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.top_services && analytics.top_services.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_services.map((service, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: COLORS[i % COLORS.length], color: '#000' }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.count} atendimentos</p>
                        </div>
                      </div>
                      <p className="font-bold text-primary">R$ {service.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Top Professionals */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Top Profissionais</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.top_professionals && analytics.top_professionals.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_professionals.map((pro, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground"
                        >
                          {pro.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{pro.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{pro.appointments} atendimentos</span>
                            {pro.avg_rating && (
                              <span className="flex items-center gap-1">
                                <Star size={10} className="text-primary fill-primary" />
                                {pro.avg_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-primary">R$ {pro.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cancellation Rate */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(analytics?.cancellation_rate || 0) > 10 ? (
                  <AlertTriangle size={32} className="text-warning" />
                ) : (
                  <TrendingDown size={32} className="text-success" />
                )}
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {(analytics?.cancellation_rate || 0).toFixed(1)}%
                  </p>
                  <p className="text-muted-foreground">Taxa de Cancelamento</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium text-foreground">
                  {analytics?.cancelled_appointments || 0} cancelados
                </p>
                <p className="text-sm text-muted-foreground">
                  de {analytics?.total_appointments || 0} agendamentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;
