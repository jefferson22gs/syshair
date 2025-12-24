import { motion } from "framer-motion";

const partners = [
    {
        name: "Studio M Hair",
        logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=100&fit=crop",
        type: "Salão de Beleza"
    },
    {
        name: "Barbearia Classic",
        logo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=100&fit=crop",
        type: "Barbearia"
    },
    {
        name: "Espaço Beleza Total",
        logo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=100&fit=crop",
        type: "Estética"
    },
    {
        name: "The Barber Shop",
        logo: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=100&fit=crop",
        type: "Barbearia"
    },
    {
        name: "Beauty Center",
        logo: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200&h=100&fit=crop",
        type: "Salão Premium"
    },
    {
        name: "Hair Design",
        logo: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=200&h=100&fit=crop",
        type: "Studio"
    }
];

export const PartnersSection = () => {
    return (
        <section className="py-16 relative overflow-hidden bg-background">
            <div className="container px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                        Usado por mais de 2.500 salões
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-foreground">
                        Salões que <span className="text-gradient-gold">confiam</span> no SysHair
                    </h3>
                </motion.div>

                {/* Partners Marquee */}
                <div className="relative overflow-hidden">
                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

                    {/* Scrolling Container */}
                    <motion.div
                        animate={{ x: [0, -1200] }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 30,
                                ease: "linear",
                            },
                        }}
                        className="flex gap-8"
                    >
                        {/* Duplicate partners for seamless loop */}
                        {[...partners, ...partners, ...partners].map((partner, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 group"
                            >
                                <div className="glass-card rounded-2xl p-6 w-[200px] h-[120px] flex flex-col items-center justify-center transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-gold">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden mb-3 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                                        <img
                                            src={partner.logo}
                                            alt={partner.name}
                                            className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
                                        />
                                    </div>
                                    <p className="text-sm font-medium text-foreground text-center truncate w-full">
                                        {partner.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {partner.type}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap justify-center gap-6 mt-12"
                >
                    {[
                        { icon: "🔒", text: "Dados criptografados" },
                        { icon: "⚡", text: "99.9% uptime" },
                        { icon: "🇧🇷", text: "Servidores no Brasil" },
                        { icon: "💳", text: "Pagamento seguro" },
                    ].map((badge, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/30"
                        >
                            <span>{badge.icon}</span>
                            <span className="text-sm text-muted-foreground">{badge.text}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
