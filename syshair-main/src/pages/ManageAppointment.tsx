import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  MapPin,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  salon_id: string;
  service_id: string;
  professional_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  appointment_date: string;
  status: string;
  cancellation_reason: string | null;
  created_at: string;
  services: {
    name: string;
    duration: number;
    price: number;
  };
  professionals: {
    name: string;
  };
  salons: {
    name: string;
    address: string;
  };
}

export default function ManageAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const appointmentId = searchParams.get("id");
  const phone = searchParams.get("phone");

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Reagendamento
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  useEffect(() => {
    if (appointmentId && phone) {
      loadAppointment();
    } else {
      toast({
        title: "Link inválido",
        description: "Este link de gerenciamento não é válido",
        variant: "destructive",
      });
    }
  }, [appointmentId, phone]);

  useEffect(() => {
    if (showRescheduleModal && appointment) {
      loadAvailableDates();
    }
  }, [showRescheduleModal, appointment]);

  useEffect(() => {
    if (selectedDate && appointment) {
      loadAvailableTimes(selectedDate);
    }
  }, [selectedDate, appointment]);

  const loadAppointment = async () => {
    if (!appointmentId || !phone) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          services (name, duration, price),
          professionals (name),
          salons (name, address)
        `)
        .eq("id", appointmentId)
        .eq("client_phone", phone)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("Agendamento não encontrado");
      }

      setAppointment(data);
    } catch (error: any) {
      console.error("Error loading appointment:", error);
      toast({
        title: "Erro ao carregar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDates = () => {
    // Gerar próximos 14 dias (excluindo hoje se já passou)
    const dates: Date[] = [];
    const today = startOfDay(new Date());

    for (let i = 1; i <= 14; i++) {
      dates.push(addDays(today, i));
    }

    setAvailableDates(dates);
  };

  const loadAvailableTimes = async (date: Date) => {
    if (!appointment) return;

    try {
      // Buscar horários disponíveis para o profissional nesta data
      const { data: existingAppointments, error } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("salon_id", appointment.salon_id)
        .eq("professional_id", appointment.professional_id)
        .gte("appointment_date", format(date, "yyyy-MM-dd 00:00:00"))
        .lte("appointment_date", format(date, "yyyy-MM-dd 23:59:59"))
        .neq("status", "cancelled");

      if (error) throw error;

      // Gerar horários de 9h às 19h (intervalos de 30min)
      const allTimes: string[] = [];
      for (let hour = 9; hour <= 19; hour++) {
        allTimes.push(`${hour.toString().padStart(2, "0")}:00`);
        if (hour < 19) {
          allTimes.push(`${hour.toString().padStart(2, "0")}:30`);
        }
      }

      // Filtrar horários já ocupados
      const occupiedTimes = existingAppointments?.map(apt =>
        format(new Date(apt.appointment_date), "HH:mm")
      ) || [];

      const available = allTimes.filter(time => !occupiedTimes.includes(time));
      setAvailableTimes(available);
    } catch (error: any) {
      console.error("Error loading times:", error);
      toast({
        title: "Erro ao carregar horários",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (!appointment || !cancellationReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do cancelamento",
        variant: "destructive",
      });
      return;
    }

    setCancelling(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancellation_reason: cancellationReason,
        })
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso",
      });

      setShowCancelModal(false);
      loadAppointment();
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) {
      toast({
        title: "Selecione data e horário",
        description: "Por favor, escolha uma nova data e horário",
        variant: "destructive",
      });
      return;
    }

    setRescheduling(true);
    try {
      const [hours, minutes] = selectedTime.split(":");
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: newDate.toISOString(),
        })
        .eq("id", appointment.id);

      if (error) throw error;

      toast({
        title: "Agendamento reagendado",
        description: "Seu agendamento foi reagendado com sucesso",
      });

      setShowRescheduleModal(false);
      loadAppointment();
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast({
        title: "Erro ao reagendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRescheduling(false);
    }
  };

  const canModify = () => {
    if (!appointment) return false;
    if (appointment.status === "cancelled" || appointment.status === "completed") return false;

    // Só pode modificar se faltar mais de 2 horas
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntil > 2;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle />
              Agendamento não encontrado
            </CardTitle>
            <CardDescription>
              Não foi possível encontrar este agendamento. Verifique o link e tente novamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.appointment_date);
  const isPast = isBefore(appointmentDate, new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Gerenciar Agendamento</h1>
          <p className="text-muted-foreground">
            Visualize, cancele ou reagende seu horário
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {appointment.status === "cancelled" ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-full">
              <X size={16} />
              <span className="font-medium">Cancelado</span>
            </div>
          ) : appointment.status === "completed" ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full">
              <CheckCircle size={16} />
              <span className="font-medium">Concluído</span>
            </div>
          ) : isPast ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-500/10 text-gray-500 rounded-full">
              <Clock size={16} />
              <span className="font-medium">Expirado</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-full">
              <CheckCircle size={16} />
              <span className="font-medium">Confirmado</span>
            </div>
          )}
        </div>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-semibold">{appointment.salons.name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.salons.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Scissors className="text-primary" size={20} />
                <div>
                  <p className="font-semibold">{appointment.services.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.services.duration} min • R$ {appointment.services.price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-primary" size={20} />
                <div>
                  <p className="font-semibold">{appointment.professionals.name}</p>
                  <p className="text-sm text-muted-foreground">Profissional</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-primary" size={20} />
                <div>
                  <p className="font-semibold">
                    {format(appointmentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(appointmentDate, "HH:mm")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-primary" size={20} />
                <div>
                  <p className="font-semibold">{appointment.client_name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.client_phone}</p>
                </div>
              </div>
            </div>

            {appointment.cancellation_reason && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <p className="text-sm font-semibold text-red-500 mb-1">Motivo do cancelamento:</p>
                <p className="text-sm text-muted-foreground">{appointment.cancellation_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {canModify() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowRescheduleModal(true)}
              className="w-full"
            >
              <RefreshCw size={20} className="mr-2" />
              Reagendar
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setShowCancelModal(true)}
              className="w-full"
            >
              <X size={20} className="mr-2" />
              Cancelar
            </Button>
          </div>
        )}

        {!canModify() && appointment.status !== "cancelled" && appointment.status !== "completed" && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-yellow-500">Não é possível modificar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cancelamentos e reagendamentos só podem ser feitos com pelo menos 2 horas de antecedência.
                    Entre em contato com o salão para alterações de última hora.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Cancelamento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                placeholder="Por favor, informe o motivo do cancelamento..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling || !cancellationReason.trim()}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Cancelando...
                </>
              ) : (
                "Confirmar Cancelamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Reagendamento */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reagendar Horário</DialogTitle>
            <DialogDescription>
              Escolha uma nova data e horário para seu agendamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Selecione uma data</Label>
              <div className="grid grid-cols-4 gap-2">
                {availableDates.map((date) => (
                  <Button
                    key={date.toISOString()}
                    variant={selectedDate && isBefore(Math.abs(date.getTime() - selectedDate.getTime()), 1000) ? "default" : "outline"}
                    onClick={() => setSelectedDate(date)}
                    className="flex flex-col h-auto py-3"
                  >
                    <span className="text-xs">{format(date, "EEE", { locale: ptBR })}</span>
                    <span className="text-lg font-bold">{format(date, "dd")}</span>
                    <span className="text-xs">{format(date, "MMM", { locale: ptBR })}</span>
                  </Button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div>
                <Label className="mb-3 block">Selecione um horário</Label>
                {availableTimes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum horário disponível para esta data
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduling || !selectedDate || !selectedTime}
            >
              {rescheduling ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Reagendando...
                </>
              ) : (
                "Confirmar Reagendamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
