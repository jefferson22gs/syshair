import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  DollarSign, 
  Calendar, 
  Users,
  TrendingUp,
  BarChart3
} from "lucide-react";

interface SalonUnit {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
  stats?: {
    revenue: number;
    appointments: number;
    clients: number;
  };
}

interface SalonGroup {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
}

const MultiUnitsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<SalonGroup | null>(null);
  const [units, setUnits] = useState<SalonUnit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [totalStats, setTotalStats] = useState({ revenue: 0, appointments: 0, clients: 0 });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Check if user has a group
      const { data: existingGroup } = await supabase
        .from('salon_groups')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existingGroup) {
        setGroup(existingGroup);
        
        // Fetch all salons in the group
        const { data: salons } = await supabase
          .from('salons')
          .select('id, name, city, state, is_active')
          .eq('group_id', existingGroup.id);

        if (salons) {
          // Fetch stats for each salon
          const unitsWithStats = await Promise.all(salons.map(async (salon) => {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            
            const { data: appointments } = await supabase
              .from('appointments')
              .select('final_price')
              .eq('salon_id', salon.id)
              .eq('status', 'completed')
              .gte('created_at', startOfMonth);

            const revenue = appointments?.reduce((sum, a) => sum + (a.final_price || 0), 0) || 0;
            
            const { count: clientsCount } = await supabase
              .from('clients')
              .select('*', { count: 'exact', head: true })
              .eq('salon_id', salon.id);

            return {
              ...salon,
              stats: {
                revenue,
                appointments: appointments?.length || 0,
                clients: clientsCount || 0
              }
            };
          }));

          setUnits(unitsWithStats);
          
          // Calculate totals
          const totals = unitsWithStats.reduce((acc, unit) => ({
            revenue: acc.revenue + (unit.stats?.revenue || 0),
            appointments: acc.appointments + (unit.stats?.appointments || 0),
            clients: acc.clients + (unit.stats?.clients || 0)
          }), { revenue: 0, appointments: 0, clients: 0 });
          
          setTotalStats(totals);
        }
      } else {
        // Fetch user's single salon
        const { data: salon } = await supabase
          .from('salons')
          .select('id, name, city, state, is_active')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (salon) {
          setUnits([{ ...salon, stats: { revenue: 0, appointments: 0, clients: 0 } }]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) return;

    try {
      const { data: newGroup, error } = await supabase
        .from('salon_groups')
        .insert({
          name: groupName,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update existing salon to belong to this group
      if (units.length > 0) {
        await supabase
          .from('salons')
          .update({ group_id: newGroup.id, is_franchise: true })
          .eq('id', units[0].id);
      }

      setGroup(newGroup);
      setIsDialogOpen(false);
      toast.success("Grupo criado com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo");
    }
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Multi-Unidades
            </h1>
            <p className="text-muted-foreground">
              {group ? `Grupo: ${group.name}` : 'Gerencie múltiplas unidades do seu negócio'}
            </p>
          </div>
          
          {!group && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gold">
                  <Plus size={18} className="mr-2" />
                  Criar Grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Grupo de Salões</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Grupo</Label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Ex: Rede Beauty Hair"
                    />
                  </div>
                  <Button variant="gold" className="w-full" onClick={createGroup}>
                    Criar Grupo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Consolidated Stats */}
        {group && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <DollarSign size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {totalStats.revenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Faturamento Total</p>
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
                      {totalStats.appointments}
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
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {totalStats.clients}
                    </p>
                    <p className="text-xs text-muted-foreground">Clientes Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-gold-light flex items-center justify-center">
                    <Building2 size={20} className="text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {units.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Units Grid */}
        {units.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma unidade encontrada</p>
              <p className="text-sm text-muted-foreground">
                Configure seu primeiro salão para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <Card key={unit.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center">
                        <Building2 size={24} className="text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{unit.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {unit.city && unit.state ? `${unit.city}, ${unit.state}` : 'Sem localização'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      unit.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {unit.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">
                        R$ {(unit.stats?.revenue || 0).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {unit.stats?.appointments || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Agendamentos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {unit.stats?.clients || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        {!group && units.length > 0 && (
          <Card className="glass-card border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">
                    Expanda seu negócio
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Crie um grupo para gerenciar múltiplas unidades, ver relatórios consolidados 
                    e comparar o desempenho entre suas unidades.
                  </p>
                  <Button variant="gold" size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Criar Grupo de Franquias
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default MultiUnitsPage;
