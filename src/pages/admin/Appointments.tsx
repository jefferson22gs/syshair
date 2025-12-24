import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Clock, User, Check, X, ChevronLeft, ChevronRight, MoreVertical, CheckCircle, XCircle, Edit, Ban, UserX, Phone, MessageCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Appointment = Tables<"appointments"> & {
  services?: { name: string; duration_minutes: number } | null;
  professionals?: { name: string } | null;
};

type Service = Tables<"services">;
type Professional = Tables<"professionals">;

const statusColors = {
  pending: 'bg-warning/20 text-warning',
  confirmed: 'bg-success/20 text-success',
  completed: 'bg-primary/20 text-primary',
  cancelled: 'bg-destructive/20 text-destructive',
  no_show: 'bg-muted text-muted-foreground',
};

const statusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    service_id: "",
    professional_id: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
  });

  useEffect(() => {
    fetchData();
  }, [user, selectedDate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: salon } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!salon) {
        setLoading(false);
        return;
      }

      setSalonId(salon.id);

      // Fetch appointments for selected date
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services:service_id (name, duration_minutes),
          professionals:professional_id (name)
        `)
        .eq('salon_id', salon.id)
        .eq('date', selectedDate)
        .order('start_time');

      if (error) throw error;
      setAppointments(appointmentsData || []);

      // Fetch services and professionals
      const [servicesRes, professionalsRes] = await Promise.all([
        supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true),
        supabase.from('professionals').select('*').eq('salon_id', salon.id).eq('is_active', true),
      ]);

      setServices(servicesRes.data || []);
      setProfessionals(professionalsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!salonId) return;

    if (!formData.client_name || !formData.service_id || !formData.professional_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    if (!service) return;

    // Calculate end time
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          salon_id: salonId,
          client_name: formData.client_name,
          client_phone: formData.client_phone || null,
          service_id: formData.service_id,
          professional_id: formData.professional_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: endTime,
          price: service.price,
          final_price: service.price,
          status: 'confirmed',
        });

      if (error) throw error;
      toast.success("Agendamento criado!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error(error.message || "Erro ao criar agendamento");
    }
  };

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show") => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success("Status atualizado!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      client_phone: "",
      service_id: "",
      professional_id: "",
      date: selectedDate,
      start_time: "09:00",
    });
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const timeSlots = [];
  for (let h = 8; h <= 20; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    timeSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!salonId) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">Configure seu salão primeiro</p>
          <Button variant="gold" onClick={() => window.location.href = '/admin/settings'}>
            Configurar Salão
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground mt-1">Gerencie os agendamentos do salão</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus size={18} className="mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Preencha os dados do agendamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome do Cliente *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Telefone</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select
                    value={formData.service_id}
                    onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
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
                <div className="space-y-2">
                  <Label>Profissional *</Label>
                  <Select
                    value={formData.professional_id}
                    onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>
                          {pro.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Select
                      value={formData.start_time}
                      onValueChange={(value) => setFormData({ ...formData, start_time: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="gold" onClick={handleSubmit}>
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Date Navigation */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
                <ChevronLeft size={20} />
              </Button>
              <div className="flex items-center gap-4">
                <Calendar size={20} className="text-primary" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                <span className="text-foreground font-medium">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum agendamento para esta data
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-gold-light flex flex-col items-center justify-center text-primary-foreground">
                        <span className="text-lg font-bold">{appointment.start_time?.slice(0, 5)}</span>
                        <span className="text-xs">-{appointment.end_time?.slice(0, 5)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-lg">
                          {appointment.client_name || 'Cliente'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {appointment.services?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {appointment.professionals?.name}
                          </span>
                        </div>
                        {appointment.client_phone && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📞 {appointment.client_phone}
                          </p>
                        )}
                        {appointment.notes && (
                          <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 px-2 py-1 rounded">
                            📝 {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${statusColors[appointment.status as keyof typeof statusColors]}`}>
                        {statusLabels[appointment.status as keyof typeof statusLabels]}
                      </span>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          R$ {appointment.final_price.toFixed(2)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {/* Actions based on current status */}
                          {appointment.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => updateStatus(appointment.id, 'confirmed')}
                                className="text-success"
                              >
                                <CheckCircle size={16} className="mr-2" />
                                Confirmar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(appointment.id, 'cancelled')}
                                className="text-destructive"
                              >
                                <XCircle size={16} className="mr-2" />
                                Recusar
                              </DropdownMenuItem>
                            </>
                          )}

                          {appointment.status === 'confirmed' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => updateStatus(appointment.id, 'completed')}
                                className="text-success"
                              >
                                <Check size={16} className="mr-2" />
                                Marcar como Concluído
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(appointment.id, 'no_show')}
                                className="text-warning"
                              >
                                <UserX size={16} className="mr-2" />
                                Não Compareceu
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus(appointment.id, 'cancelled')}
                                className="text-destructive"
                              >
                                <Ban size={16} className="mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}

                          {(appointment.status === 'cancelled' || appointment.status === 'no_show') && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.id, 'pending')}
                            >
                              <Edit size={16} className="mr-2" />
                              Reabrir (Pendente)
                            </DropdownMenuItem>
                          )}

                          {appointment.status === 'completed' && (
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.id, 'confirmed')}
                            >
                              <Edit size={16} className="mr-2" />
                              Voltar para Confirmado
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Contact options */}
                          {appointment.client_phone && (
                            <>
                              <DropdownMenuItem
                                onClick={() => window.open(`tel:${appointment.client_phone}`, '_blank')}
                              >
                                <Phone size={16} className="mr-2" />
                                Ligar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const phone = appointment.client_phone?.replace(/\D/g, '');
                                  const message = encodeURIComponent(
                                    `Olá ${appointment.client_name}! Seu agendamento está ${statusLabels[appointment.status as keyof typeof statusLabels].toLowerCase()} para ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')} às ${appointment.start_time?.slice(0, 5)}.`
                                  );
                                  window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                }}
                              >
                                <MessageCircle size={16} className="mr-2" />
                                WhatsApp
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default Appointments;
