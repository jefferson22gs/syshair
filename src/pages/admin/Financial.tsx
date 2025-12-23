import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialData {
  totalRevenue: number;
  totalAppointments: number;
  averageTicket: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingRevenue: number;
}

interface ProfessionalCommission {
  id: string;
  name: string;
  totalRevenue: number;
  commission: number;
  appointmentsCount: number;
  commissionRate: number;
}

const Financial = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    totalAppointments: 0,
    averageTicket: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingRevenue: 0,
  });
  const [professionalCommissions, setProfessionalCommissions] = useState<ProfessionalCommission[]>([]);

  useEffect(() => {
    fetchSalon();
  }, [user]);

  useEffect(() => {
    if (salonId) {
      fetchFinancialData();
    }
  }, [salonId, selectedMonth]);

  const fetchSalon = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (data) {
      setSalonId(data.id);
    } else {
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    if (!salonId) return;

    setLoading(true);
    const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    try {
      // Fetch all appointments for the month
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          status,
          price,
          final_price,
          professional_id,
          professionals:professional_id (
            id,
            name,
            commission_rate
          )
        `)
        .eq('salon_id', salonId)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (appointments) {
        // Calculate overall stats
        const completed = appointments.filter(a => a.status === 'completed');
        const cancelled = appointments.filter(a => a.status === 'cancelled');
        const pending = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

        const totalRevenue = completed.reduce((sum, apt) => sum + (apt.final_price || 0), 0);
        const pendingRevenue = pending.reduce((sum, apt) => sum + (apt.final_price || 0), 0);
        const averageTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

        setFinancialData({
          totalRevenue,
          totalAppointments: appointments.length,
          averageTicket,
          completedAppointments: completed.length,
          cancelledAppointments: cancelled.length,
          pendingRevenue,
        });

        // Calculate professional commissions
        const professionalMap = new Map<string, ProfessionalCommission>();

        completed.forEach(apt => {
          if (apt.professionals) {
            const prof = apt.professionals as any;
            const existing = professionalMap.get(prof.id);
            const revenue = apt.final_price || 0;
            const commissionRate = prof.commission_rate || 0;

            if (existing) {
              existing.totalRevenue += revenue;
              existing.commission += revenue * (commissionRate / 100);
              existing.appointmentsCount += 1;
            } else {
              professionalMap.set(prof.id, {
                id: prof.id,
                name: prof.name,
                totalRevenue: revenue,
                commission: revenue * (commissionRate / 100),
                appointmentsCount: 1,
                commissionRate,
              });
            }
          }
        });

        setProfessionalCommissions(Array.from(professionalMap.values()));
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCommissions = professionalCommissions.reduce((sum, p) => sum + p.commission, 0);
  const netRevenue = financialData.totalRevenue - totalCommissions;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <h1 className="font-display text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe faturamento e comissões
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-4 py-2 bg-secondary rounded-lg min-w-[160px] text-center">
              <span className="font-medium text-foreground">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-success">
                  <TrendingUp size={14} />
                  Receita
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                R$ {financialData.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calendar size={24} className="text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  {financialData.completedAppointments} concluídos
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {financialData.totalAppointments}
              </p>
              <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BarChart3 size={24} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                R$ {financialData.averageTicket.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center">
                  <TrendingUp size={24} className="text-primary-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                R$ {netRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-xl font-bold text-foreground">
                    R$ {financialData.pendingRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <DollarSign size={20} className="text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissões</p>
                  <p className="text-xl font-bold text-foreground">
                    R$ {totalCommissions.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <TrendingDown size={20} className="text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cancelamentos</p>
                  <p className="text-xl font-bold text-foreground">
                    {financialData.cancelledAppointments}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Calendar size={20} className="text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Commissions */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Comissões por Profissional
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {professionalCommissions.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum atendimento concluído neste período
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {professionalCommissions.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold">
                        {prof.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{prof.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {prof.appointmentsCount} atendimentos • {prof.commissionRate}% comissão
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Faturou R$ {prof.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        R$ {prof.commission.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 mt-4">
                  <p className="font-medium text-foreground">Total de Comissões</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {totalCommissions.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Financial;
