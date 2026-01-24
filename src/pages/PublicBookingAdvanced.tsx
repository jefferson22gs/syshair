import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Star,
    User,
    Scissors,
    CreditCard,
    Check,
    MapPin,
    Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/icons/Logo";
import { cn } from "@/lib/utils";

// Types
interface Professional {
    id: string;
    name: string;
    avatar: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    available: boolean;
}

interface Service {
    id: string;
    name: string;
    duration: number;
    price: number;
    image: string;
    category: string;
}

interface TimeSlot {
    time: string;
    available: boolean;
}

// Mock Data
const mockProfessionals: Professional[] = [
    {
        id: '1',
        name: 'Julia Santos',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        specialty: 'Coloração & Mechas',
        rating: 4.9,
        reviewCount: 127,
        available: true,
    },
    {
        id: '2',
        name: 'Carlos Eduardo',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
        specialty: 'Cortes Masculinos',
        rating: 4.8,
        reviewCount: 89,
        available: true,
    },
    {
        id: '3',
        name: 'Ana Oliveira',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
        specialty: 'Penteados & Eventos',
        rating: 5.0,
        reviewCount: 156,
        available: false,
    },
];

const mockServices: Service[] = [
    {
        id: '1',
        name: 'Corte Feminino',
        duration: 45,
        price: 80,
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop',
        category: 'Cortes',
    },
    {
        id: '2',
        name: 'Corte Masculino',
        duration: 30,
        price: 50,
        image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=200&h=200&fit=crop',
        category: 'Cortes',
    },
    {
        id: '3',
        name: 'Coloração',
        duration: 90,
        price: 180,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop',
        category: 'Coloração',
    },
    {
        id: '4',
        name: 'Mechas',
        duration: 120,
        price: 250,
        image: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=200&h=200&fit=crop',
        category: 'Coloração',
    },
    {
        id: '5',
        name: 'Escova',
        duration: 45,
        price: 60,
        image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=200&h=200&fit=crop',
        category: 'Finalização',
    },
    {
        id: '6',
        name: 'Barba',
        duration: 30,
        price: 40,
        image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200&h=200&fit=crop',
        category: 'Barba',
    },
];

const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 19; hour++) {
        slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            available: Math.random() > 0.3,
        });
        if (hour < 19) {
            slots.push({
                time: `${hour.toString().padStart(2, '0')}:30`,
                available: Math.random() > 0.3,
            });
        }
    }
    return slots;
};

const PublicBookingAdvanced = () => {
    const [step, setStep] = useState<'service' | 'professional' | 'datetime' | 'confirm'>('service');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [wantsPrepayment, setWantsPrepayment] = useState(false);

    const timeSlots = useMemo(() => generateTimeSlots(), [selectedDate]);

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days: (Date | null)[] = [];

        // Add empty days for the start of the week
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        // Add all days in the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isPast = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isSelected = (date: Date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const totalDuration = selectedService?.duration || 0;
    const totalPrice = selectedService?.price || 0;

    const handleConfirmBooking = () => {
        // In real app, this would submit to Supabase
        alert('Agendamento confirmado! Você receberá uma confirmação por WhatsApp.');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Logo size="sm" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin size={14} />
                        <span>Salão Elegance</span>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="border-b border-border/50 bg-card/30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                        {['Serviço', 'Profissional', 'Data/Hora', 'Confirmar'].map((label, index) => {
                            const stepOrder = ['service', 'professional', 'datetime', 'confirm'];
                            const currentIndex = stepOrder.indexOf(step);
                            const isActive = index === currentIndex;
                            const isCompleted = index < currentIndex;

                            return (
                                <div key={label} className="flex items-center">
                                    <div className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                                        isActive && "bg-primary text-primary-foreground",
                                        isCompleted && "bg-green-500 text-white",
                                        !isActive && !isCompleted && "bg-secondary text-muted-foreground"
                                    )}>
                                        {isCompleted ? <Check size={16} /> : index + 1}
                                    </div>
                                    <span className={cn(
                                        "ml-2 text-sm hidden sm:inline",
                                        isActive ? "text-foreground font-medium" : "text-muted-foreground"
                                    )}>
                                        {label}
                                    </span>
                                    {index < 3 && (
                                        <ChevronRight className="mx-2 text-muted-foreground" size={16} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    {/* Step 1: Select Service */}
                    {step === 'service' && (
                        <motion.div
                            key="service"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                                Escolha o serviço
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {mockServices.map((service) => (
                                    <motion.div
                                        key={service.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setSelectedService(service);
                                            setStep('professional');
                                        }}
                                        className={cn(
                                            "cursor-pointer rounded-2xl overflow-hidden border-2 transition-colors",
                                            selectedService?.id === service.id
                                                ? "border-primary shadow-gold"
                                                : "border-border/50 hover:border-primary/50"
                                        )}
                                    >
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className="w-full aspect-square object-cover"
                                        />
                                        <div className="p-4 bg-card">
                                            <h3 className="font-medium text-foreground">{service.name}</h3>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {service.duration}min
                                                </span>
                                                <span className="font-bold text-primary">
                                                    R$ {service.price}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Select Professional */}
                    {step === 'professional' && (
                        <motion.div
                            key="professional"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold text-foreground">
                                    Escolha o profissional
                                </h2>
                                <Button variant="ghost" onClick={() => setStep('service')}>
                                    <ChevronLeft size={18} className="mr-1" />
                                    Voltar
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mockProfessionals.map((professional) => (
                                    <motion.div
                                        key={professional.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            onClick={() => {
                                                if (professional.available) {
                                                    setSelectedProfessional(professional);
                                                    setStep('datetime');
                                                }
                                            }}
                                            className={cn(
                                                "cursor-pointer transition-all overflow-hidden",
                                                !professional.available && "opacity-50 cursor-not-allowed",
                                                selectedProfessional?.id === professional.id && "ring-2 ring-primary shadow-gold"
                                            )}
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <img
                                                        src={professional.avatar}
                                                        alt={professional.name}
                                                        className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-foreground">{professional.name}</h3>
                                                            {!professional.available && (
                                                                <Badge variant="secondary" className="text-xs">Indisponível</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {professional.specialty}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="flex items-center gap-1 text-yellow-500">
                                                                <Star size={14} className="fill-current" />
                                                                <span className="font-medium text-foreground">{professional.rating}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                ({professional.reviewCount} avaliações)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}

                                {/* Any Professional Option */}
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card
                                        onClick={() => {
                                            setSelectedProfessional(null);
                                            setStep('datetime');
                                        }}
                                        className="cursor-pointer transition-all border-dashed"
                                    >
                                        <CardContent className="p-6 flex items-center justify-center h-full min-h-[120px]">
                                            <div className="text-center">
                                                <User className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                                <p className="font-medium text-foreground">Sem preferência</p>
                                                <p className="text-sm text-muted-foreground">Qualquer profissional</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Select Date/Time */}
                    {step === 'datetime' && (
                        <motion.div
                            key="datetime"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold text-foreground">
                                    Escolha data e horário
                                </h2>
                                <Button variant="ghost" onClick={() => setStep('professional')}>
                                    <ChevronLeft size={18} className="mr-1" />
                                    Voltar
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Calendar */}
                                <Card className="glass-card">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <button
                                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <h3 className="font-semibold text-foreground">
                                                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <button
                                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>

                                        {/* Week days */}
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {weekDays.map((day) => (
                                                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Days */}
                                        <div className="grid grid-cols-7 gap-1">
                                            {days.map((date, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => date && !isPast(date) && setSelectedDate(date)}
                                                    disabled={!date || isPast(date)}
                                                    className={cn(
                                                        "aspect-square rounded-lg flex items-center justify-center text-sm transition-colors",
                                                        !date && "invisible",
                                                        date && isPast(date) && "text-muted-foreground/30 cursor-not-allowed",
                                                        date && !isPast(date) && "hover:bg-secondary cursor-pointer",
                                                        date && isToday(date) && "ring-2 ring-primary/50",
                                                        date && isSelected(date) && "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    {date?.getDate()}
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Time Slots */}
                                <Card className="glass-card">
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold text-foreground mb-4">
                                            Horários disponíveis para {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </h3>

                                        <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto py-2">
                                            {timeSlots.map((slot) => (
                                                <button
                                                    key={slot.time}
                                                    onClick={() => slot.available && setSelectedTime(slot.time)}
                                                    disabled={!slot.available}
                                                    className={cn(
                                                        "p-3 rounded-lg text-sm font-medium transition-colors",
                                                        slot.available && "hover:bg-primary/20 cursor-pointer border border-border/50",
                                                        !slot.available && "bg-secondary/30 text-muted-foreground/50 cursor-not-allowed line-through",
                                                        selectedTime === slot.time && "bg-primary text-primary-foreground border-primary"
                                                    )}
                                                >
                                                    {slot.time}
                                                </button>
                                            ))}
                                        </div>

                                        {selectedTime && (
                                            <Button
                                                variant="gold"
                                                className="w-full mt-6"
                                                onClick={() => setStep('confirm')}
                                            >
                                                Continuar
                                                <ChevronRight size={18} className="ml-1" />
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Confirm */}
                    {step === 'confirm' && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-2xl mx-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold text-foreground">
                                    Confirme seu agendamento
                                </h2>
                                <Button variant="ghost" onClick={() => setStep('datetime')}>
                                    <ChevronLeft size={18} className="mr-1" />
                                    Voltar
                                </Button>
                            </div>

                            <Card className="glass-card overflow-hidden">
                                <div className="bg-gradient-to-r from-primary/20 to-gold-light/20 p-6 border-b border-border/50">
                                    <div className="flex items-center gap-4">
                                        <CalendarIcon className="w-12 h-12 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Data e horário</p>
                                            <p className="text-xl font-bold text-foreground">
                                                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-lg text-primary font-semibold">{selectedTime}</p>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {/* Service */}
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
                                        <img
                                            src={selectedService?.image}
                                            alt={selectedService?.name}
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{selectedService?.name}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Clock size={14} />
                                                {totalDuration} minutos
                                            </p>
                                        </div>
                                        <p className="font-bold text-primary">R$ {totalPrice}</p>
                                    </div>

                                    {/* Professional */}
                                    {selectedProfessional && (
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
                                            <img
                                                src={selectedProfessional.avatar}
                                                alt={selectedProfessional.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="font-medium text-foreground">{selectedProfessional.name}</p>
                                                <p className="text-sm text-muted-foreground">{selectedProfessional.specialty}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Prepayment Option */}
                                    <div className="p-4 rounded-xl border border-border/50">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={wantsPrepayment}
                                                onChange={(e) => setWantsPrepayment(e.target.checked)}
                                                className="mt-1 w-5 h-5 rounded border-border text-primary"
                                            />
                                            <div>
                                                <p className="font-medium text-foreground flex items-center gap-2">
                                                    <CreditCard size={18} className="text-primary" />
                                                    Pagar antecipado (opcional)
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Garanta seu horário pagando agora e ganhe <span className="text-green-500 font-medium">5% de desconto</span>
                                                </p>
                                                {wantsPrepayment && (
                                                    <p className="text-lg font-bold text-primary mt-2">
                                                        Total: R$ {(totalPrice * 0.95).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    {/* Estimated Time */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-primary" />
                                            <span className="text-foreground">Tempo estimado</span>
                                        </div>
                                        <span className="font-bold text-primary">{totalDuration} minutos</span>
                                    </div>

                                    {/* Confirm Button */}
                                    <Button variant="gold" size="lg" className="w-full" onClick={handleConfirmBooking}>
                                        {wantsPrepayment ? (
                                            <>
                                                <CreditCard size={18} className="mr-2" />
                                                Pagar e Confirmar
                                            </>
                                        ) : (
                                            <>
                                                <Check size={18} className="mr-2" />
                                                Confirmar Agendamento
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground">
                                        Você receberá uma confirmação por WhatsApp
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PublicBookingAdvanced;
