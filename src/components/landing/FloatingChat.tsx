import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { DEVELOPER_INFO, getSupportWhatsAppLink } from "@/config/contact";

const quickMessages = [
    "Quero conhecer o sistema",
    "Como funciona o trial?",
    "Preciso de ajuda para migrar",
    "Quanto custa?",
];

const botResponses: Record<string, string> = {
    "Quero conhecer o sistema": "Ótimo! 🎉 O SysHair é o sistema mais completo para gestão de salões. Posso agendar uma demonstração gratuita para você! Qual melhor horário?",
    "Como funciona o trial?": "Nosso trial é de 7 dias com TODAS as funcionalidades liberadas! 🚀 Não precisa de cartão de crédito. Quer começar agora?",
    "Preciso de ajuda para migrar": "Sem problemas! Nossa equipe faz a migração gratuita para você. 💪 Geralmente leva menos de 1 hora. Posso agendar?",
    "Quanto custa?": "O SysHair custa apenas R$ 39,90/mês com TUDO incluso! 💰 Profissionais ilimitados, agendamentos ilimitados, sem taxas extras. Quer testar grátis?",
};

interface Message {
    id: number;
    text: string;
    isBot: boolean;
    timestamp: Date;
}

export const FloatingChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Olá! 👋 Sou a assistente virtual do SysHair. Como posso ajudar você hoje?",
            isBot: true,
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showBubble, setShowBubble] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowBubble(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleSendMessage = (text: string) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: messages.length + 1,
            text,
            isBot: false,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");

        // Simulate bot typing
        setIsTyping(true);
        setTimeout(() => {
            const botText = botResponses[text] ||
                "Entendi! 😊 Para um atendimento personalizado, vou te conectar com nossa equipe via WhatsApp. Clique no botão abaixo!";

            const botMessage: Message = {
                id: messages.length + 2,
                text: botText,
                isBot: true,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <>
            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <AnimatePresence>
                    {showBubble && !isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute bottom-full right-0 mb-3 mr-2 whitespace-nowrap"
                        >
                            <div className="bg-card border border-border rounded-2xl rounded-br-none px-4 py-3 shadow-lg">
                                <p className="text-sm text-foreground">💬 Precisa de ajuda?</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setIsOpen(true);
                        setShowBubble(false);
                    }}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-gold-light text-primary-foreground shadow-gold flex items-center justify-center relative"
                >
                    <MessageCircle size={28} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                </motion.button>
            </div>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-120px)]"
                    >
                        <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border border-border/50 flex flex-col max-h-[500px]">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-primary to-gold-light p-3 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">SysHair Assistente</p>
                                        <p className="text-[10px] text-white/70">🟢 Online agora</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="h-[200px] overflow-y-auto p-3 space-y-3 bg-surface-1 flex-1">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.isBot
                                                ? 'bg-card border border-border/50 rounded-bl-none'
                                                : 'bg-gradient-to-r from-primary to-gold-light text-primary-foreground rounded-br-none'
                                                }`}
                                        >
                                            <p className="text-sm">{message.text}</p>
                                            <p className={`text-xs mt-1 ${message.isBot ? 'text-muted-foreground' : 'text-white/70'}`}>
                                                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}

                                {isTyping && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-card border border-border/50 rounded-2xl rounded-bl-none px-4 py-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Quick Replies */}
                            <div className="px-3 py-2 border-t border-border/30 bg-card/50 flex-shrink-0">
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {quickMessages.map((msg, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSendMessage(msg)}
                                            className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </div>

                                {/* Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                                        placeholder="Digite sua mensagem..."
                                        className="flex-1 px-3 py-1.5 rounded-full bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                    />
                                    <button
                                        onClick={() => handleSendMessage(inputValue)}
                                        className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-gold-light flex items-center justify-center text-primary-foreground"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* WhatsApp Link */}
                            <a
                                href={getSupportWhatsAppLink('demo')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-green-500 text-center text-white text-sm font-medium hover:bg-green-600 transition-colors flex-shrink-0"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <MessageCircle size={16} />
                                    Falar no WhatsApp ({DEVELOPER_INFO.whatsappFormatted})
                                </span>
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
