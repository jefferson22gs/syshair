import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  status: string;
  services: {
    name: string;
    duration: number;
    price: number;
  };
  professionals: {
    name: string;
  };
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointments: Appointment[];
}

export function EnhancedSalonCalendar() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);

  // Modal de adicionar agendamento
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [newAppointment, setNewAppointment] = useState({
    client_name: "",
    client_phone: "",
    service_id: "",
    professional_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSalonId();
  }, []);

  useEffect(() => {
    if (salonId) {
      loadData();
    }
  }, [salonId, selectedDate]);

  const loadSalonId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (salon) {
      setSalonId(salon.id);
    }
  };

  const loadData = async () => {
    if (!salonId) return;

    setLoading(true);
    try {
      // Carregar agendamentos do dia
      const startOfDayDate = startOfDay(selectedDate);
      const endOfDayDate = new Date(startOfDayDate);
      endOfDayDate.setHours(23, 59, 59, 999);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          services (name, duration, price),
          professionals (name)
        `)
        .eq("salon_id", salonId)
        .gte("appointment_date", startOfDayDate.toISOString())
        .lte("appointment_date", endOfDayDate.toISOString())
        .order("appointment_date", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      setAppointments(appointmentsData || []);

      // Carregar serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, duration, price")
        .eq("salon_id", salonId)
        .eq("active", true);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Carregar profissionais
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("salon_id", salonId)
        .eq("active", true);

      if (professionalsError) throw professionalsError;
      setProfessionals(professionalsData || []);

      // Gerar time slots
      generateTimeSlots(appointmentsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (appointmentsData: Appointment[]) => {
    const slots: TimeSlot[] = [];

    // Gerar horários de 8h às 20h (intervalos de 30min)
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 20 && minute > 0) break; // Parar em 20:00

        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        // Verificar se há agendamentos neste horário
        const appointmentsAtTime = appointmentsData.filter(apt => {
          const aptTime = format(new Date(apt.appointment_date), "HH:mm");
          return aptTime === time;
        });

        slots.push({
          time,
          available: appointmentsAtTime.length === 0,
          appointments: appointmentsAtTime,
        });
      }
    }

    setTimeSlots(slots);
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const openAddModal = (time: string) => {
    setSelectedTime(time);
    setNewAppointment({
      client_name: "",
      client_phone: "",
      service_id: "",
      professional_id: "",
    });
    setShowAddModal(true);
  };

  const handleAddAppointment = async () => {
    if (!salonId || !selectedTime) return;

    if (!newAppointment.client_name || !newAppointment.client_phone || !newAppointment.service_id || !newAppointment.professional_id) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const [hours, minutes] = selectedTime.split(":");
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from("appointments")
        .insert({
          salon_id: salonId,
          service_id: newAppointment.service_id,
          professional_id: newAppointment.professional_id,
          client_name: newAppointment.client_name,
          client_phone: newAppointment.client_phone,
          appointment_date: appointmentDate.toISOString(),
          status: "confirmed",
        });

      if (error) throw error;

      toast({
        title: "Agendamento criado",
        description: "O agendamento foi adicionado com sucesso",
      });

      setShowAddModal(false);
      loadData();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle size={14} className="text-green-500" />;
      case "completed":
        return <CheckCircle size={14} className="text-blue-500" />;
      case "cancelled":
        return <XCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-gray-500" />;
    }
  };

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
    available: timeSlots.filter(s => s.available).length,
  };

  return (
    <div className="space-y-6">
      {/* Header com navegação de data */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-primary" />
              Agenda do Salão
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousDay}>
                <ChevronLeft size={20} />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoje
              </Button>
              <div className="px-4 py-2 bg-muted rounded-lg font-semibold min-w-[200px] text-center">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </div>
              <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estatísticas do dia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.confirmed}</p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
            <p className="text-sm text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-primary">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Horários Vagos</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade de horários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Horários do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {timeSlots.map((slot) => (
                <div
                  key={slot.time}
                  className={cn(
                    "flex items-start gap-4 p-3 rounded-lg border transition-colors",
                    slot.available ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" : "bg-muted/50"
                  )}
                >
                  <div className="w-16 flex-shrink-0">
                    <p className="font-semibold text-sm">{slot.time}</p>
                  </div>

                  <div className="flex-1">
                    {slot.available ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAddModal(slot.time)}
                        className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      >
                        <Plus size={16} className="mr-2" />
                        Horário disponível - Clique para agendar
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {slot.appointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                          >
                            <div className="mt-1">
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{apt.client_name}</p>
                              <p className="text-xs text-muted-foreground">{apt.services.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {apt.professionals.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {apt.client_phone}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {apt.services.duration}min
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de adicionar agendamento */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Horário</Label>
              <Input value={selectedTime} disabled className="bg-muted" />
            </div>

            <div>
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="Nome completo"
                value={newAppointment.client_name}
                onChange={(e) => setNewAppointment({ ...newAppointment, client_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Telefone *</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={newAppointment.client_phone}
                onChange={(e) => setNewAppointment({ ...newAppointment, client_phone: e.target.value })}
              />
            </div>

            <div>
              <Label>Serviço *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={newAppointment.service_id}
                onChange={(e) => setNewAppointment({ ...newAppointment, service_id: e.target.value })}
              >
                <option value="">Selecione um serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.duration}min - R$ {service.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Profissional *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={newAppointment.professional_id}
                onChange={(e) => setNewAppointment({ ...newAppointment, professional_id: e.target.value })}
              >
                <option value="">Selecione um profissional</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddAppointment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Salvando...
                </>
              ) : (
                "Adicionar Agendamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
