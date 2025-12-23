import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package, Edit2, Trash2, Percent } from "lucide-react";

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  service_id: string;
  quantity: number;
  price: number;
  discount_percent: number;
  validity_days: number;
  is_active: boolean;
  service?: { name: string; price: number };
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const PackagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_id: '',
    quantity: 5,
    discount_percent: 10,
    validity_days: 365
  });

  useEffect(() => {
    fetchSalonId();
  }, [user]);

  useEffect(() => {
    if (salonId) {
      fetchPackages();
      fetchServices();
    }
  }, [salonId]);

  const fetchSalonId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (data) setSalonId(data.id);
    setLoading(false);
  };

  const fetchPackages = async () => {
    if (!salonId) return;
    
    const { data, error } = await supabase
      .from('service_packages')
      .select(`
        *,
        service:services(name, price)
      `)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching packages:", error);
      return;
    }
    setPackages(data || []);
  };

  const fetchServices = async () => {
    if (!salonId) return;
    
    const { data } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('salon_id', salonId)
      .eq('is_active', true);

    setServices(data || []);
  };

  const calculatePackagePrice = () => {
    const service = services.find(s => s.id === formData.service_id);
    if (!service) return 0;
    
    const totalPrice = service.price * formData.quantity;
    const discount = totalPrice * (formData.discount_percent / 100);
    return totalPrice - discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId || !formData.service_id) return;

    const packagePrice = calculatePackagePrice();

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from('service_packages')
          .update({
            name: formData.name,
            description: formData.description || null,
            service_id: formData.service_id,
            quantity: formData.quantity,
            price: packagePrice,
            discount_percent: formData.discount_percent,
            validity_days: formData.validity_days
          })
          .eq('id', editingPackage.id);

        if (error) throw error;
        toast.success("Pacote atualizado!");
      } else {
        const { error } = await supabase
          .from('service_packages')
          .insert({
            salon_id: salonId,
            name: formData.name,
            description: formData.description || null,
            service_id: formData.service_id,
            quantity: formData.quantity,
            price: packagePrice,
            discount_percent: formData.discount_percent,
            validity_days: formData.validity_days
          });

        if (error) throw error;
        toast.success("Pacote criado!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      console.error("Error saving package:", error);
      toast.error("Erro ao salvar pacote");
    }
  };

  const handleEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      service_id: pkg.service_id,
      quantity: pkg.quantity,
      discount_percent: pkg.discount_percent,
      validity_days: pkg.validity_days
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pacote?")) return;

    try {
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Pacote excluído!");
      fetchPackages();
    } catch (error) {
      console.error("Error deleting package:", error);
      toast.error("Erro ao excluir pacote");
    }
  };

  const resetForm = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      service_id: '',
      quantity: 5,
      discount_percent: 10,
      validity_days: 365
    });
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
              Pacotes de Serviços
            </h1>
            <p className="text-muted-foreground">
              Crie pacotes promocionais para fidelizar clientes
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus size={18} className="mr-2" />
                Novo Pacote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Pacote</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: 5 Cortes com Desconto"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição opcional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Serviço</Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={2}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Validade (dias)</Label>
                  <Input
                    type="number"
                    min={30}
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) })}
                    required
                  />
                </div>

                {formData.service_id && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Preço final do pacote:</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {calculatePackagePrice().toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.quantity}x {services.find(s => s.id === formData.service_id)?.name}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gold" className="flex-1">
                    {editingPackage ? 'Salvar' : 'Criar Pacote'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Packages Grid */}
        {packages.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nenhum pacote criado</p>
              <p className="text-sm text-muted-foreground">
                Crie pacotes para oferecer descontos em múltiplos serviços
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center">
                      <Package size={24} className="text-primary-foreground" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground mb-1">
                    {pkg.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {pkg.quantity}x {pkg.service?.name}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {pkg.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-success">
                        <Percent size={12} />
                        <span>{pkg.discount_percent}% de desconto</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Validade</p>
                      <p className="text-sm font-medium">{pkg.validity_days} dias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PackagesPage;
