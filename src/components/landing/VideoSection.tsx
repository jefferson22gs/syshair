import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";

export const VideoSection = () => {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background to-surface-1" />
            <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />

            <div className="container relative z-10 px-4">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                    >
                        <Play className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Veja em ação</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="font-display text-4xl md:text-5xl font-bold mb-4"
                    >
                        Conheça o{' '}
                        <span className="text-gradient-gold">SysHair</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        Veja como é fácil gerenciar seu salão com nossa plataforma
                    </motion.p>
                </div>

                {/* Video Container */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="relative rounded-3xl overflow-hidden glass-card border-2 border-primary/20 shadow-gold">
                        {/* Video Thumbnail */}
                        {!isPlaying ? (
                            <div className="relative aspect-video group cursor-pointer" onClick={() => setIsPlaying(true)}>
                                {/* Background Image */}
                                <img
                                    src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=675&fit=crop"
                                    alt="SysHair Demo"
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                                {/* Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="relative"
                                    >
                                        {/* Pulse Animation */}
                                        <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-primary to-gold-light flex items-center justify-center shadow-gold group-hover:shadow-2xl transition-shadow">
                                            <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-primary-foreground ml-1" />
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Bottom Info */}
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-semibold text-lg">Tour completo pelo sistema</p>
                                            <p className="text-white/70 text-sm">2 minutos • HD</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                                            <span className="text-white text-sm">▶ Assistir demo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative aspect-video bg-black">
                                {/* Close Button */}
                                <button
                                    onClick={() => setIsPlaying(false)}
                                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* YouTube Embed or Video Player */}
                                <iframe
                                    className="w-full h-full"
                                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                                    title="SysHair Demo"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}
                    </div>

                    {/* Feature Pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-wrap justify-center gap-3 mt-8"
                    >
                        {[
                            "📅 Agendamento Online",
                            "📱 PWA Mobile",
                            "💬 WhatsApp Automático",
                            "📊 Relatórios Inteligentes",
                            "💰 Gestão Financeira"
                        ].map((feature, index) => (
                            <span
                                key={index}
                                className="px-4 py-2 rounded-full bg-card/50 border border-border/30 text-sm text-muted-foreground"
                            >
                                {feature}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
