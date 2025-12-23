import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";

const faqs = [
    {
        category: "Geral",
        questions: [
            {
                question: "O que é o SysHair?",
                answer: "O SysHair é um sistema de gestão completo para salões de beleza, barbearias e estúdios de estética. Ele automatiza agendamentos, gerencia clientes, controla finanças e muito mais - tudo em uma única plataforma acessível pelo celular ou computador."
            },
            {
                question: "Preciso instalar algum programa?",
                answer: "Não! O SysHair funciona 100% na nuvem. Você pode acessar pelo navegador do celular, tablet ou computador. Também oferecemos um app PWA que pode ser instalado na tela inicial do seu dispositivo para acesso rápido."
            },
            {
                question: "O sistema funciona offline?",
                answer: "Sim! Mesmo sem internet, você consegue consultar sua agenda e dados dos clientes. Quando a conexão voltar, tudo é sincronizado automaticamente."
            }
        ]
    },
    {
        category: "Pagamento",
        questions: [
            {
                question: "Quanto custa o SysHair?",
                answer: "O SysHair custa apenas R$ 39,90/mês com TODAS as funcionalidades liberadas. Não cobramos por número de profissionais ou agendamentos. Um preço único e simples, sem surpresas."
            },
            {
                question: "Posso testar antes de assinar?",
                answer: "Sim! Oferecemos 7 dias de teste grátis com acesso a todas as funcionalidades. Você não precisa cadastrar cartão de crédito para começar o trial."
            },
            {
                question: "Como funciona o pagamento?",
                answer: "O pagamento é feito mensalmente via cartão de crédito, PIX ou boleto através do Mercado Pago. Você pode cancelar a qualquer momento, sem multas ou taxas adicionais."
            },
            {
                question: "Vocês cobram taxa sobre os agendamentos?",
                answer: "Não! Diferente de outros sistemas, não cobramos nenhuma taxa sobre os serviços realizados no seu salão. O valor da assinatura é fixo."
            }
        ]
    },
    {
        category: "Funcionalidades",
        questions: [
            {
                question: "Como funciona a integração com WhatsApp?",
                answer: "Você conecta o WhatsApp do seu salão ao SysHair e o sistema envia automaticamente: confirmações de agendamento, lembretes 24h e 1h antes, pesquisas de satisfação e mensagens de aniversário. Tudo automático!"
            },
            {
                question: "Meus clientes conseguem agendar sozinhos?",
                answer: "Sim! Você recebe um link personalizado (ex: syshair.app/seu-salao) que pode compartilhar nas redes sociais. Os clientes acessam, escolhem o serviço, profissional e horário - sem precisar ligar."
            },
            {
                question: "Posso gerenciar múltiplas unidades?",
                answer: "Sim! O plano inclui gestão de múltiplas unidades. Você consegue ver relatórios consolidados ou separados por filial, tudo no mesmo painel."
            },
            {
                question: "O sistema calcula comissões automaticamente?",
                answer: "Sim! Você define a porcentagem de comissão de cada profissional e o sistema calcula automaticamente com base nos serviços realizados. No final do mês, é só consultar o relatório."
            }
        ]
    },
    {
        category: "Suporte",
        questions: [
            {
                question: "Como funciona o suporte?",
                answer: "Oferecemos suporte via WhatsApp, e-mail e chat dentro do sistema. Nosso tempo médio de resposta é de 2 horas em dias úteis. Também temos uma central de ajuda com tutoriais em vídeo."
            },
            {
                question: "Vocês ajudam a migrar meus dados?",
                answer: "Sim! Nossa equipe ajuda você a importar sua lista de clientes e configurar todos os serviços. A migração é gratuita e geralmente leva menos de 1 hora."
            },
            {
                question: "E se eu quiser cancelar?",
                answer: "Você pode cancelar a qualquer momento pelo próprio painel, sem burocracia. Não cobramos multa e seus dados ficam disponíveis para exportação por 30 dias após o cancelamento."
            }
        ]
    }
];

export const FAQSection = () => {
    const [activeCategory, setActiveCategory] = useState("Geral");
    const [openQuestion, setOpenQuestion] = useState<string | null>(null);

    const currentFAQs = faqs.find(f => f.category === activeCategory)?.questions || [];

    return (
        <section className="py-24 relative overflow-hidden" id="faq">
            <div className="absolute inset-0 bg-surface-1" />
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />

            <div className="container relative z-10 px-4">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
                    >
                        <HelpCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Dúvidas frequentes</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="font-display text-4xl md:text-5xl font-bold mb-4"
                    >
                        Perguntas{' '}
                        <span className="text-gradient-gold">frequentes</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        Tudo que você precisa saber para começar
                    </motion.p>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {faqs.map((category) => (
                        <motion.button
                            key={category.category}
                            onClick={() => {
                                setActiveCategory(category.category);
                                setOpenQuestion(null);
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === category.category
                                    ? 'bg-gradient-to-r from-primary to-gold-light text-primary-foreground shadow-gold'
                                    : 'bg-card/50 text-muted-foreground border border-border/50 hover:border-primary/50 hover:text-foreground'
                                }`}
                        >
                            {category.category}
                        </motion.button>
                    ))}
                </div>

                {/* FAQ Accordion */}
                <div className="max-w-3xl mx-auto space-y-4">
                    <AnimatePresence mode="wait">
                        {currentFAQs.map((faq, index) => (
                            <motion.div
                                key={faq.question}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card rounded-2xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenQuestion(openQuestion === faq.question ? null : faq.question)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-medium text-foreground pr-4">{faq.question}</span>
                                    <motion.div
                                        animate={{ rotate: openQuestion === faq.question ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-shrink-0"
                                    >
                                        <ChevronDown className={`w-5 h-5 transition-colors ${openQuestion === faq.question ? 'text-primary' : 'text-muted-foreground'
                                            }`} />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {openQuestion === faq.question && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <div className="px-6 pb-6 pt-0">
                                                <div className="h-px bg-border/50 mb-4" />
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Contact CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mt-12"
                >
                    <p className="text-muted-foreground mb-4">
                        Não encontrou sua dúvida?
                    </p>
                    <motion.a
                        href="https://wa.me/5511999999999"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition-colors shadow-lg"
                    >
                        <MessageCircle size={20} />
                        Fale conosco no WhatsApp
                    </motion.a>
                </motion.div>
            </div>
        </section>
    );
};
