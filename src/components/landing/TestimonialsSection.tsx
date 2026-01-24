import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
    {
        id: 1,
        name: "Marina Santos",
        role: "Proprietária - Studio M Hair",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "O SysHair transformou completamente a gestão do meu salão! Antes eu passava horas organizando agendas no papel, agora tudo é automático. Meu faturamento aumentou 40% em 3 meses.",
        location: "São Paulo, SP",
        highlight: "+40% faturamento"
    },
    {
        id: 2,
        name: "Carlos Eduardo",
        role: "Dono - Barbearia Classic",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "A integração com WhatsApp é sensacional! Meus clientes recebem lembretes automáticos e as faltas diminuíram drasticamente. Super recomendo para qualquer barbearia.",
        location: "Rio de Janeiro, RJ",
        highlight: "-70% faltas"
    },
    {
        id: 3,
        name: "Juliana Ferreira",
        role: "Gestora - Espaço Beleza Total",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "Gerencio 3 unidades pelo SysHair e é muito prático! Consigo ver o faturamento de todas as lojas em tempo real. O suporte também é excelente, sempre muito atenciosos.",
        location: "Belo Horizonte, MG",
        highlight: "3 unidades"
    },
    {
        id: 4,
        name: "Rafael Mendes",
        role: "Barbeiro Autônomo",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "Mesmo sendo autônomo, o sistema me ajuda demais. Meus clientes agendam direto pelo link e eu consigo ver minha agenda no celular. O preço é muito justo pelo que oferece!",
        location: "Curitiba, PR",
        highlight: "100% digital"
    },
    {
        id: 5,
        name: "Patrícia Lima",
        role: "Dona - Salão Patrícia Beauty",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
        rating: 5,
        text: "O sistema de fidelidade com pontos foi um diferencial incrível! Minhas clientes adoram e voltam mais vezes para acumular pontos. É marketing automático funcionando!",
        location: "Brasília, DF",
        highlight: "+60% retorno"
    }
];

export const TestimonialsSection = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setDirection(1);
            setCurrentIndex((prev) => (prev + 1) % testimonials.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const nextTestimonial = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
        }),
    };

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-surface-1 via-background to-surface-1" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

            <div className="container relative z-10 px-4">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                    >
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm font-medium text-primary">+2.500 salões confiam no SysHair</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="font-display text-4xl md:text-5xl font-bold mb-4"
                    >
                        O que nossos{' '}
                        <span className="text-gradient-gold">clientes dizem</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        Histórias reais de donos de salão que transformaram seus negócios
                    </motion.p>
                </div>

                {/* Main Testimonial Card */}
                <div className="max-w-4xl mx-auto">
                    <div className="relative">
                        {/* Navigation Buttons */}
                        <button
                            onClick={prevTestimonial}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-16 z-20 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextTestimonial}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-16 z-20 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Testimonial Card */}
                        <div className="overflow-hidden">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={currentIndex}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="glass-card rounded-3xl p-8 md:p-12"
                                >
                                    {/* Quote Icon */}
                                    <div className="absolute top-6 right-6 md:top-10 md:right-10">
                                        <Quote className="w-12 h-12 md:w-16 md:h-16 text-primary/20" />
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-8 items-start">
                                        {/* Avatar & Info */}
                                        <div className="flex flex-col items-center md:items-start gap-4 md:min-w-[200px]">
                                            <div className="relative">
                                                <img
                                                    src={testimonials[currentIndex].avatar}
                                                    alt={testimonials[currentIndex].name}
                                                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover ring-4 ring-primary/20"
                                                />
                                                <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-gold-light text-xs font-bold text-primary-foreground">
                                                    {testimonials[currentIndex].highlight}
                                                </div>
                                            </div>

                                            <div className="text-center md:text-left">
                                                <h4 className="font-display text-xl font-bold text-foreground">
                                                    {testimonials[currentIndex].name}
                                                </h4>
                                                <p className="text-sm text-primary font-medium">
                                                    {testimonials[currentIndex].role}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    📍 {testimonials[currentIndex].location}
                                                </p>
                                            </div>

                                            {/* Rating Stars */}
                                            <div className="flex gap-1">
                                                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                                                    <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Testimonial Text */}
                                        <div className="flex-1">
                                            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed italic">
                                                "{testimonials[currentIndex].text}"
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Dots Indicator */}
                        <div className="flex justify-center gap-2 mt-8">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setDirection(index > currentIndex ? 1 : -1);
                                        setCurrentIndex(index);
                                    }}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                                            ? 'bg-primary w-8'
                                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto"
                >
                    {[
                        { value: "4.9", label: "Nota média", icon: "⭐" },
                        { value: "2.500+", label: "Salões ativos", icon: "💇" },
                        { value: "50K+", label: "Agendamentos/mês", icon: "📅" },
                        { value: "98%", label: "Taxa de satisfação", icon: "💖" },
                    ].map((stat, index) => (
                        <div key={index} className="text-center p-4 rounded-2xl bg-card/50 border border-border/30">
                            <div className="text-2xl mb-2">{stat.icon}</div>
                            <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
