import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Scissors,
  User,
  Calendar as CalendarIcon,
  Gift,
  Loader2,
  Phone,
  MapPin,
  MessageCircle,
  AlertCircle,
  ShoppingCart,
  Store,
  Plus,
  Minus,
  Package,
  Star,
  Download
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePWA } from "@/hooks/usePWA";
import { usePushNotificationsFCM } from "@/hooks/usePushNotificationsFCM";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  icon: string | null;
}

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
  working_hours: { start: string; end: string } | null;
  working_days: number[] | null;
}

interface Salon {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  opening_time: string;
  closing_time: string;
  working_days: number[];
  primary_color: string | null;
  logo_url: string | null;
  public_booking_enabled: boolean;
  slug: string;
}

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: string | null;
}

interface CartItem {
  id: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  duration_minutes?: number;
}

interface PendingReview {
  appointment_id: string;
  professional_id: string;
  professional_name: string;
  service_name: string;
  date: string;
  client_id: string;
}

const PublicSalon = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, installApp } = usePWA();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Push notifications - subscription será salva no banco quando cliente permitir
  // Usando Firebase Cloud Messaging para mensagens completas
  const { subscribe: subscribePush, isSupported: pushSupported, permission: pushPermission } = usePushNotificationsFCM(salon?.id);

  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientBirthday, setClientBirthday] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ id: string; discount: number; message: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Review system states
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentRating, setCurrentRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const steps = [
    { number: 1, label: "Serviço", icon: Scissors },
    { number: 2, label: "Profissional", icon: User },
    { number: 3, label: "Data e Hora", icon: CalendarIcon },
    { number: 4, label: "Confirmar", icon: Check },
  ];

  useEffect(() => {
    if (slug) {
      fetchSalonBySlug();
    }
  }, [slug]);

  const fetchSalonBySlug = async () => {
    try {
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (salonError) throw salonError;

      if (!salonData) {
        setError("Salão não encontrado");
        setLoading(false);
        return;
      }

      if (!salonData.public_booking_enabled) {
        setError("Agendamento online não está disponível para este salão");
        setLoading(false);
        return;
      }

      setSalon({
        id: salonData.id,
        name: salonData.name,
        description: salonData.description,
        address: salonData.address,
        city: salonData.city,
        state: salonData.state,
        phone: salonData.phone,
        whatsapp: salonData.whatsapp,
        opening_time: salonData.opening_time || '09:00',
        closing_time: salonData.closing_time || '19:00',
        working_days: salonData.working_days || [1, 2, 3, 4, 5, 6],
        primary_color: salonData.primary_color,
        logo_url: salonData.logo_url,
        public_booking_enabled: salonData.public_booking_enabled ?? true,
        slug: salonData.slug || '',
      });

      // Fetch services
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes, icon')
        .eq('salon_id', salonData.id)
        .eq('is_active', true)
        .order('name');

      if (servicesData) setServices(servicesData);

      // Fetch professionals
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('id, name, specialty, avatar_url, working_hours, working_days')
        .eq('salon_id', salonData.id)
        .eq('is_active', true)
        .order('name');

      if (professionalsData) {
        setProfessionals(professionalsData.map(p => ({
          ...p,
          working_hours: p.working_hours as { start: string; end: string } | null,
        })));
      }

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, description, price, stock, image_url, category')
        .eq('salon_id', salonData.id)
        .eq('is_active', true)
        .gt('stock', 0)
        .order('name');

      if (productsData) setProducts(productsData);
    } catch (err) {
      console.error("Error fetching salon:", err);
      setError("Erro ao carregar dados do salão");
    } finally {
      setLoading(false);
    }
  };

  // Cart helper functions
  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    const existing = cart.find(c => c.id === item.id && c.type === type);
    if (existing) {
      if (type === 'product') {
        setCart(cart.map(c =>
          c.id === item.id && c.type === type
            ? { ...c, quantity: c.quantity + 1 }
            : c
        ));
      }
      return;
    }

    const cartItem: CartItem = {
      id: item.id,
      type,
      name: item.name,
      price: item.price,
      quantity: 1,
      duration_minutes: type === 'service' ? (item as Service).duration_minutes : undefined,
    };
    setCart([...cart, cartItem]);
  };

  const removeFromCart = (id: string, type: 'service' | 'product') => {
    const existing = cart.find(c => c.id === id && c.type === type);
    if (existing && existing.quantity > 1 && type === 'product') {
      setCart(cart.map(c =>
        c.id === id && c.type === type
          ? { ...c, quantity: c.quantity - 1 }
          : c
      ));
    } else {
      setCart(cart.filter(c => !(c.id === id && c.type === type)));
    }
  };

  const isInCart = (id: string, type: 'service' | 'product') => {
    return cart.some(c => c.id === id && c.type === type);
  };

  const getCartQuantity = (id: string, type: 'service' | 'product') => {
    return cart.find(c => c.id === id && c.type === type)?.quantity || 0;
  };

  const cartServices = cart.filter(c => c.type === 'service');
  const cartProducts = cart.filter(c => c.type === 'product');
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartServicesDuration = cartServices.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

  const selectedProfessionalData = professionals.find(p => p.id === selectedProfessional);

  useEffect(() => {
    if (selectedDate && cartServices.length > 0 && salon) {
      fetchAvailableSlots();
    }
  }, [selectedDate, cartServices.length, selectedProfessional]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate || cartServices.length === 0 || !salon) return;

    setLoadingSlots(true);
    setSelectedTime("");

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const dayOfWeek = selectedDate.getDay();

      if (!salon.working_days.includes(dayOfWeek)) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      // Calculate total duration from all services in cart
      const totalDuration = cartServicesDuration;
      if (totalDuration === 0) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      const duration = totalDuration;
      const slots: string[] = [];
      const [openHour, openMin] = salon.opening_time.split(':').map(Number);
      const [closeHour, closeMin] = salon.closing_time.split(':').map(Number);

      let currentTime = openHour * 60 + openMin;
      const endTime = closeHour * 60 + closeMin - duration;

      // Filter past times if date is today
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

      while (currentTime <= endTime) {
        if (!isToday || currentTime > currentMinutes + 30) {
          const hours = Math.floor(currentTime / 60);
          const minutes = currentTime % 60;
          slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }
        currentTime += 30;
      }

      // Get existing appointments
      let query = supabase
        .from('appointments')
        .select('start_time, end_time, professional_id')
        .eq('salon_id', salon.id)
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed']);

      const professionalId = selectedProfessional === "any" ? undefined : selectedProfessional;
      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data: existingAppointments } = await query;

      // Filter out busy slots
      const availableSlots = slots.filter(slot => {
        const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
        const slotEnd = `${Math.floor((slotMinutes + duration) / 60).toString().padStart(2, '0')}:${((slotMinutes + duration) % 60).toString().padStart(2, '0')}`;

        const hasConflict = existingAppointments?.some(apt => {
          if (professionalId && apt.professional_id !== professionalId) {
            return false;
          }
          return (slot < apt.end_time && slotEnd > apt.start_time);
        });

        return !hasConflict;
      });

      setAvailableSlots(availableSlots);
    } catch (err) {
      console.error("Error fetching slots:", err);
      toast.error("Erro ao buscar horários");
    } finally {
      setLoadingSlots(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim() || cart.length === 0 || !salon) return;

    setValidatingCoupon(true);
    try {
      const { data: couponData, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('salon_id', salon.id)
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !couponData) {
        toast.error("Cupom não encontrado");
        setCouponApplied(null);
        return;
      }

      const now = new Date();
      if (couponData.valid_from && new Date(couponData.valid_from) > now) {
        toast.error("Cupom ainda não está válido");
        return;
      }
      if (couponData.valid_until && new Date(couponData.valid_until) < now) {
        toast.error("Cupom expirado");
        return;
      }
      if (couponData.max_uses && couponData.uses_count && couponData.uses_count >= couponData.max_uses) {
        toast.error("Cupom esgotado");
        return;
      }
      if (couponData.min_purchase && cartTotal < couponData.min_purchase) {
        toast.error(`Valor mínimo de R$ ${couponData.min_purchase.toFixed(2)} necessário`);
        return;
      }

      let discount = 0;
      if (couponData.type === 'percentage') {
        discount = cartTotal * (couponData.value / 100);
      } else {
        discount = Math.min(couponData.value, cartTotal);
      }

      setCouponApplied({
        id: couponData.id,
        discount,
        message: couponData.type === 'percentage'
          ? `${couponData.value}% de desconto!`
          : `R$ ${couponData.value.toFixed(2)} de desconto!`
      });
      toast.success("Cupom aplicado!");
    } catch (err) {
      toast.error("Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Check for pending reviews when client enters phone
  const checkPendingReviews = async (phone: string) => {
    if (!salon || !phone || phone.length < 10) return;

    try {
      // Find client by phone
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('salon_id', salon.id)
        .eq('phone', phone.trim())
        .maybeSingle();

      if (!client) return;

      // Find completed appointments without reviews
      const { data: completedAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          professional_id,
          professionals:professional_id (name),
          services:service_id (name)
        `)
        .eq('salon_id', salon.id)
        .eq('client_phone', phone.trim())
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(5);

      if (!completedAppointments || completedAppointments.length === 0) return;

      // Check which appointments don't have reviews
      const pendingList: PendingReview[] = [];
      for (const apt of completedAppointments) {
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('appointment_id', apt.id)
          .maybeSingle();

        if (!existingReview) {
          pendingList.push({
            appointment_id: apt.id,
            professional_id: apt.professional_id,
            professional_name: (apt.professionals as any)?.name || 'Profissional',
            service_name: (apt.services as any)?.name || 'Serviço',
            date: apt.date,
            client_id: client.id,
          });
        }
      }

      if (pendingList.length > 0) {
        setPendingReviews(pendingList);
        setShowReviewModal(true);
      }
    } catch (err) {
      console.error("Error checking pending reviews:", err);
    }
  };

  // Submit review for a past appointment
  const submitReview = async () => {
    if (pendingReviews.length === 0 || !salon) return;

    const review = pendingReviews[0];
    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          salon_id: salon.id,
          client_id: review.client_id,
          professional_id: review.professional_id,
          appointment_id: review.appointment_id,
          rating: currentRating,
          comment: reviewComment.trim() || null,
          is_public: true,
        });

      if (error) throw error;

      toast.success("Avaliação enviada! Obrigado pelo feedback!");

      // Remove this review from pending list
      setPendingReviews(prev => prev.slice(1));
      setCurrentRating(5);
      setReviewComment("");

      if (pendingReviews.length <= 1) {
        setShowReviewModal(false);
      }
    } catch (err: any) {
      console.error("Error submitting review:", err);
      toast.error(err.message || "Erro ao enviar avaliação");
    } finally {
      setSubmittingReview(false);
    }
  };

  const skipReview = () => {
    setPendingReviews(prev => prev.slice(1));
    setCurrentRating(5);
    setReviewComment("");

    if (pendingReviews.length <= 1) {
      setShowReviewModal(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (cartServices.length === 0 || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim() || !clientBirthday || !salon) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    let finalProfessionalId = selectedProfessional;
    if (selectedProfessional === "any" || !selectedProfessional) {
      if (professionals.length > 0) {
        finalProfessionalId = professionals[0].id;
      } else {
        toast.error("Nenhum profissional disponível");
        return;
      }
    }

    setSubmitting(true);
    try {
      const discount = couponApplied?.discount || 0;
      const finalPrice = cartTotal - discount;

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + cartServicesDuration;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      // Create appointment for the first service (main service)
      // Additional services are stored in notes
      const mainService = cartServices[0];
      const additionalServices = cartServices.slice(1);
      const servicesNotes = cart.map(item => `${item.name} (R$ ${item.price.toFixed(2)})`).join(', ');

      // Build notes with birthday and services
      const notesArray: string[] = [];
      if (clientBirthday) {
        notesArray.push(`Aniversário: ${clientBirthday.split('-').reverse().join('/')}`);
      }
      if (additionalServices.length > 0) {
        notesArray.push(`Serviços: ${servicesNotes}`);
      }
      if (cartProducts.length > 0) {
        const productsNotes = cartProducts.map(p => `${p.name} x${p.quantity}`).join(', ');
        notesArray.push(`Produtos: ${productsNotes}`);
      }

      const { error } = await supabase
        .from('appointments')
        .insert({
          salon_id: salon.id,
          service_id: mainService.id,
          professional_id: finalProfessionalId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedTime,
          end_time: endTime,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          coupon_id: couponApplied?.id || null,
          price: cartTotal,
          discount,
          final_price: finalPrice,
          status: 'pending',
          notes: notesArray.length > 0 ? notesArray.join(' | ') : null,
        });

      if (error) throw error;

      // Auto-create or update client in clients table with loyalty points
      // Rule: R$ 1 spent = 1 loyalty point
      try {
        const pointsEarned = Math.floor(finalPrice);

        // Check if client already exists (by phone)
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, total_visits, total_spent, loyalty_points')
          .eq('salon_id', salon.id)
          .eq('phone', clientPhone.trim())
          .maybeSingle();

        if (existingClient) {
          // Update existing client
          await supabase
            .from('clients')
            .update({
              name: clientName.trim(),
              total_visits: (existingClient.total_visits || 0) + 1,
              total_spent: (existingClient.total_spent || 0) + finalPrice,
              loyalty_points: (existingClient.loyalty_points || 0) + pointsEarned,
              last_visit_at: new Date().toISOString(),
            })
            .eq('id', existingClient.id);
        } else {
          // Create new client with loyalty points
          await supabase
            .from('clients')
            .insert({
              salon_id: salon.id,
              name: clientName.trim(),
              phone: clientPhone.trim(),
              notes: clientBirthday ? `Aniversário: ${clientBirthday.split('-').reverse().join('/')}` : null,
              total_visits: 1,
              total_spent: finalPrice,
              loyalty_points: pointsEarned,
              last_visit_at: new Date().toISOString(),
            });
        }
      } catch (clientError) {
        console.error("Error creating/updating client:", clientError);
        // Don't throw - appointment was created successfully
      }

      // Increment coupon usage if applied
      if (couponApplied?.id) {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('uses_count')
          .eq('id', couponApplied.id)
          .single();

        await supabase
          .from('coupons')
          .update({ uses_count: (couponData?.uses_count || 0) + 1 })
          .eq('id', couponApplied.id);
      }

      toast.success("Agendamento realizado com sucesso!");
      setStep(5);
    } catch (err: any) {
      console.error("Error creating appointment:", err);
      toast.error(err.message || "Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    if (salon) {
      const dayOfWeek = date.getDay();
      return !salon.working_days.includes(dayOfWeek);
    }
    return false;
  };

  const price = cartTotal;
  const discount = couponApplied?.discount || 0;
  const finalPrice = price - discount;

  const formatWorkingDays = () => {
    if (!salon) return "";
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const sortedDays = [...salon.working_days].sort();
    if (sortedDays.length === 0) return "Fechado";

    const first = sortedDays[0];
    const last = sortedDays[sortedDays.length - 1];

    if (sortedDays.length === last - first + 1) {
      return `${dayNames[first]} a ${dayNames[last]}`;
    }
    return sortedDays.map(d => dayNames[d]).join(", ");
  };

  // Custom styles based on salon primary color
  const primaryColor = salon?.primary_color || '#D4AF37';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Ops!</h1>
          <p className="text-muted-foreground mb-6">{error || "Salão não encontrado"}</p>
          <Button onClick={() => navigate('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 5) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Check size={40} style={{ color: primaryColor }} />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            Agendamento Confirmado!
          </h1>
          <p className="text-muted-foreground mb-6">
            Seu agendamento foi realizado com sucesso em <strong>{salon.name}</strong>.
          </p>
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left shadow-lg">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviços</span>
                <span className="font-medium text-foreground text-right">
                  {cartServices.map(s => s.name).join(', ') || 'Nenhum'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium text-foreground">
                  {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium text-foreground">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium text-foreground">
                  {selectedProfessional === "any" ? "A definir" : selectedProfessionalData?.name}
                </span>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    R$ {finalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {salon.whatsapp && (
            <a
              href={`https://wa.me/${salon.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle size={20} />
              Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with salon branding */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b border-border"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}10 0%, transparent 100%)`,
          borderColor: `${primaryColor}20`
        }}
      >
        <div className="container px-4 py-6">
          {/* Centered Salon Header */}
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            {salon.logo_url ? (
              <img
                src={salon.logo_url}
                alt={salon.name}
                className="h-20 w-20 rounded-2xl object-cover shadow-lg mb-4 border-2"
                style={{ borderColor: primaryColor }}
              />
            ) : (
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                {salon.name.charAt(0)}
              </div>
            )}

            {/* Salon Name */}
            <h1 className="font-display text-2xl font-bold text-foreground mb-1">
              {salon.name}
            </h1>

            {/* Address */}
            {(salon.address || salon.city) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin size={14} style={{ color: primaryColor }} />
                <span>
                  {salon.address ? `${salon.address}` : ''}
                  {salon.address && salon.city ? ' - ' : ''}
                  {salon.city ? `${salon.city}, ${salon.state}` : ''}
                </span>
              </div>
            )}

            {/* Info Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {/* Working Hours */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                <Clock size={14} />
                <span>{salon.opening_time?.slice(0, 5)} - {salon.closing_time?.slice(0, 5)} • {formatWorkingDays()}</span>
              </div>

              {/* Phone */}
              {salon.phone && (
                <a
                  href={`tel:${salon.phone}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                >
                  <Phone size={14} />
                  <span>{salon.phone}</span>
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              {/* WhatsApp Button */}
              {salon.whatsapp && (
                <a
                  href={`https://wa.me/${salon.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle size={18} />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Install PWA Button */}
              {isInstallable && !isInstalled && (
                <button
                  onClick={installApp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90 hover:scale-105"
                  style={{ backgroundColor: primaryColor, color: 'white' }}
                >
                  <Download size={18} />
                  <span>Instalar App</span>
                </button>
              )}

              {/* Already Installed Badge */}
              {isInstalled && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground">
                  <Check size={14} />
                  <span>App instalado</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Salon Description (only on step 1) */}
      {step === 1 && salon.description && (
        <div className="border-b border-border bg-card/50">
          <div className="container px-4 py-4">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-sm text-muted-foreground">{salon.description}</p>
            </div>
          </div>
        </div>
      )}

      <main className="container px-4 py-8 max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: step >= s.number
                      ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`
                      : 'hsl(var(--secondary))',
                    color: step >= s.number ? 'white' : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {step > s.number ? <Check size={18} /> : <s.icon size={18} />}
                </div>
                <span
                  className="text-xs mt-2"
                  style={{ color: step >= s.number ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className="w-12 md:w-20 h-0.5 mx-2"
                  style={{ backgroundColor: step > s.number ? primaryColor : 'hsl(var(--border))' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg">
          {/* Step 1: Select Services & Products */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Monte seu pedido
              </h2>
              <p className="text-muted-foreground mb-6">Selecione serviços e produtos que deseja</p>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'services' | 'products')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="services" className="flex items-center gap-2">
                    <Scissors size={16} />
                    Serviços
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex items-center gap-2">
                    <Store size={16} />
                    Loja
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                  {services.length === 0 ? (
                    <div className="text-center py-12">
                      <Scissors size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum serviço disponível</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => isInCart(service.id, 'service')
                            ? removeFromCart(service.id, 'service')
                            : addToCart(service, 'service')
                          }
                          className="relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left"
                          style={{
                            borderColor: isInCart(service.id, 'service') ? primaryColor : 'hsl(var(--border))',
                            backgroundColor: isInCart(service.id, 'service') ? `${primaryColor}08` : 'transparent'
                          }}
                        >
                          <span className="text-2xl">{service.icon || '✂️'}</span>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{service.name}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock size={14} />
                              {service.duration_minutes}min
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground">
                            R$ {service.price.toFixed(2)}
                          </p>
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center border-2"
                            style={{
                              borderColor: primaryColor,
                              backgroundColor: isInCart(service.id, 'service') ? primaryColor : 'transparent'
                            }}
                          >
                            {isInCart(service.id, 'service') && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="products">
                  {products.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum produto disponível</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all"
                          style={{
                            borderColor: isInCart(product.id, 'product') ? primaryColor : 'hsl(var(--border))',
                            backgroundColor: isInCart(product.id, 'product') ? `${primaryColor}08` : 'transparent'
                          }}
                        >
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                              <Package size={24} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                            )}
                            {product.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              R$ {product.price.toFixed(2)}
                            </p>
                            {isInCart(product.id, 'product') ? (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => removeFromCart(product.id, 'product')}
                                  className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-secondary"
                                  style={{ borderColor: primaryColor }}
                                >
                                  <Minus size={14} style={{ color: primaryColor }} />
                                </button>
                                <span className="font-medium w-6 text-center">{getCartQuantity(product.id, 'product')}</span>
                                <button
                                  onClick={() => addToCart(product, 'product')}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product, 'product')}
                                className="mt-2 px-3 py-1 rounded-full text-sm font-medium text-white"
                                style={{ backgroundColor: primaryColor }}
                              >
                                Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div className="mt-6 p-4 rounded-xl border-2" style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={18} style={{ color: primaryColor }} />
                      <span className="font-medium">Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  {cartServicesDuration > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <Clock size={12} className="inline mr-1" />
                      Tempo estimado: {cartServicesDuration} min
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Professional */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Escolha o profissional
              </h2>
              <p className="text-muted-foreground mb-6">Ou deixe em branco para qualquer um disponível</p>

              <div className="grid gap-3">
                {professionals.map((pro) => (
                  <button
                    key={pro.id}
                    onClick={() => setSelectedProfessional(pro.id)}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left"
                    style={{
                      borderColor: selectedProfessional === pro.id ? primaryColor : 'hsl(var(--border))',
                      backgroundColor: selectedProfessional === pro.id ? `${primaryColor}08` : 'transparent'
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}
                    >
                      {pro.avatar_url ? (
                        <img src={pro.avatar_url} alt={pro.name} className="w-full h-full object-cover" />
                      ) : (
                        pro.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{pro.name}</p>
                      {pro.specialty && (
                        <p className="text-sm text-muted-foreground">{pro.specialty}</p>
                      )}
                    </div>
                    {selectedProfessional === pro.id && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => setSelectedProfessional("any")}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: selectedProfessional === "any" ? primaryColor : 'hsl(var(--border))',
                    backgroundColor: selectedProfessional === "any" ? `${primaryColor}08` : 'transparent'
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                    <User size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Sem preferência</p>
                    <p className="text-sm text-muted-foreground">Qualquer profissional disponível</p>
                  </div>
                  {selectedProfessional === "any" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Date and Time */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Data e horário
              </h2>
              <p className="text-muted-foreground mb-6">Escolha quando você quer ser atendido</p>

              <div className="mb-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  locale={ptBR}
                  className="rounded-xl border border-border p-3"
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Horários disponíveis para {format(selectedDate, "dd/MM", { locale: ptBR })}
                  </label>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum horário disponível nesta data</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className="py-3 px-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: selectedTime === slot ? primaryColor : 'hsl(var(--secondary))',
                            color: selectedTime === slot ? 'white' : 'hsl(var(--foreground))'
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Confirme seu agendamento
              </h2>
              <p className="text-muted-foreground mb-6">Revise os detalhes e preencha seus dados</p>

              {/* Summary */}
              <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviços</span>
                    <span className="font-medium text-right">{cartServices.map(s => s.name).join(', ') || 'Nenhum'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profissional</span>
                    <span className="font-medium">
                      {selectedProfessional === "any" ? "Qualquer disponível" : selectedProfessionalData?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium">
                      {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Seu nome *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Como prefere ser chamado"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Telefone / WhatsApp *</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onBlur={(e) => checkPendingReviews(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientBirthday">Data de Nascimento *</Label>
                  <Input
                    id="clientBirthday"
                    type="date"
                    value={clientBirthday}
                    onChange={(e) => setClientBirthday(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    🎂 No seu aniversário você pode ganhar um presente especial!
                  </p>
                </div>
              </div>

              {/* Coupon */}
              <div className="mb-6">
                <Label className="flex items-center gap-2 mb-2">
                  <Gift size={16} style={{ color: primaryColor }} />
                  Cupom de desconto
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    disabled={!!couponApplied}
                    maxLength={30}
                  />
                  <Button
                    onClick={validateCoupon}
                    disabled={validatingCoupon || !couponCode.trim() || !!couponApplied}
                    variant="outline"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
                {couponApplied && (
                  <p className="text-sm mt-2" style={{ color: primaryColor }}>
                    ✓ {couponApplied.message}
                  </p>
                )}
              </div>

              {/* Price Summary */}
              <div className="border-t border-border pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {price.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm" style={{ color: primaryColor }}>
                      <span>Desconto</span>
                      <span>- R$ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span style={{ color: primaryColor }}>R$ {finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={18} className="mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && cartServices.length === 0) ||
                  (step === 2 && !selectedProfessional) ||
                  (step === 3 && (!selectedDate || !selectedTime))
                }
                style={{
                  backgroundColor: primaryColor,
                  color: 'white'
                }}
              >
                Próximo
                <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleConfirmBooking}
                disabled={submitting || !clientName.trim() || !clientPhone.trim() || !clientBirthday}
                style={{
                  backgroundColor: primaryColor,
                  color: 'white'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Check size={18} className="mr-2" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Ao agendar, você concorda com os termos de uso do estabelecimento.
        </p>
      </main>

      {/* Review Modal */}
      {showReviewModal && pendingReviews.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Star size={28} style={{ color: primaryColor }} />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Avalie sua visita anterior
              </h3>
              <p className="text-sm text-muted-foreground">
                {pendingReviews[0].service_name} com {pendingReviews[0].professional_name}
                <br />
                <span className="text-xs">
                  {new Date(pendingReviews[0].date + 'T12:00:00').toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCurrentRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    fill={star <= currentRating ? primaryColor : 'transparent'}
                    stroke={star <= currentRating ? primaryColor : 'hsl(var(--muted-foreground))'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <Label htmlFor="reviewComment" className="text-sm text-muted-foreground">
                Comentário (opcional)
              </Label>
              <textarea
                id="reviewComment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Conte como foi sua experiência..."
                className="w-full mt-2 p-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground resize-none h-24"
                maxLength={500}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={skipReview}
                className="flex-1"
              >
                Pular
              </Button>
              <Button
                onClick={submitReview}
                disabled={submittingReview}
                style={{ backgroundColor: primaryColor, color: 'white' }}
                className="flex-1"
              >
                {submittingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enviar Avaliação'
                )}
              </Button>
            </div>

            {pendingReviews.length > 1 && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                +{pendingReviews.length - 1} avaliações pendentes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Prompt para ativar notificações - só renderiza quando salon está carregado */}
      {salon?.id && <NotificationPrompt salonId={salon.id} />}
    </div>
  );
};

export default PublicSalon;