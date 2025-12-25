import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, MessageCircle, Bell, Users, Gift, Megaphone, Clock, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface Client {
    id: string;
    name: string;
    phone: string | null;
    loyalty_points?: number;
    total_visits?: number;
}

const Marketing = () => {
    const { user } = useAuth();
    const [salon, setSalon] = useState<{ id: string; name: string; whatsapp: string | null } | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form state
    const [messageType, setMessageType] = useState<'promotional' | 'informative' | 'coupon'>('promotional');
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [sendVia, setSendVia] = useState<{ whatsapp: boolean; push: boolean }>({ whatsapp: true, push: false });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // Get salon
            const { data: salonData, error: salonError } = await supabase
                .from('salons')
                .select('id, name, whatsapp')
                .eq('owner_id', user?.id)
                .single();

            if (salonError) throw salonError;
            setSalon(salonData);

            // Get clients
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('id, name, phone, total_visits')
                .eq('salon_id', salonData.id)
                .order('name');

            if (clientsError) throw clientsError;
            setClients(clientsData || []);

        } catch (error: any) {
            console.error("Error:", error);
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedClients(clients.filter(c => c.phone).map(c => c.id));
        } else {
            setSelectedClients([]);
        }
    };

    const handleSelectClient = (clientId: string, checked: boolean) => {
        if (checked) {
            setSelectedClients([...selectedClients, clientId]);
        } else {
            setSelectedClients(selectedClients.filter(id => id !== clientId));
            setSelectAll(false);
        }
    };

    const handleSendNotification = async () => {
        if (!message.trim()) {
            toast.error("Digite uma mensagem");
            return;
        }
        if (selectedClients.length === 0) {
            toast.error("Selecione pelo menos um cliente");
            return;
        }
        if (!sendVia.whatsapp && !sendVia.push) {
            toast.error("Selecione pelo menos um canal de envio");
            return;
        }

        setSending(true);

        try {
            const selectedClientData = clients.filter(c => selectedClients.includes(c.id));

            if (sendVia.whatsapp) {
                // Open WhatsApp messages for each client (frontend-only solution)
                for (const client of selectedClientData) {
                    if (client.phone) {
                        const phone = client.phone.replace(/\D/g, '');
                        const personalizedMessage = message.replace('{nome}', client.name.split(' ')[0]);
                        const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(personalizedMessage)}`;

                        // Open in new tab (user needs to send manually)
                        window.open(whatsappUrl, '_blank');

                        // Small delay to avoid overwhelming the browser
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                toast.success(`${selectedClientData.length} conversas do WhatsApp abertas!`, {
                    description: "Clique em 'Enviar' em cada aba para enviar a mensagem."
                });
            }

            if (sendVia.push) {
                // Push notifications require backend - show info message
                toast.info("Push Notifications requer integração com backend", {
                    description: "Será implementado na fase de backend."
                });
            }

            // Log the notification attempt (could save to database for history)
            console.log("Notification sent:", {
                type: messageType,
                title,
                message,
                clientsCount: selectedClientData.length,
                channels: sendVia
            });

        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.message || "Erro ao enviar notificações");
        } finally {
            setSending(false);
        }
    };

    const messageTemplates = {
        promotional: [
            { title: "Promoção Especial", message: "Olá {nome}! 🎉 Temos uma promoção especial para você! Venha nos visitar e aproveite descontos incríveis. Agende já!" },
            { title: "Desconto de Fim de Semana", message: "Oi {nome}! Este fim de semana temos 20% de desconto em todos os serviços. Não perca! 💇‍♀️" },
        ],
        informative: [
            { title: "Novo Horário", message: "Olá {nome}! Informamos que a partir de agora estamos atendendo em novo horário. Confira no nosso site!" },
            { title: "Novidade no Salão", message: "Oi {nome}! Temos novidades no salão! Venha conhecer nossos novos serviços. 🌟" },
        ],
        coupon: [
            { title: "Cupom Exclusivo", message: "Olá {nome}! 🎁 Use o cupom CLIENTE10 e ganhe 10% de desconto na sua próxima visita!" },
            { title: "Presente de Aniversário", message: "Oi {nome}! 🎂 No mês do seu aniversário, você ganha um presente especial! Venha retirar." },
        ],
    };

    const applyTemplate = (template: { title: string; message: string }) => {
        setTitle(template.title);
        setMessage(template.message);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Marketing & Notificações</h1>
                <p className="text-muted-foreground">Envie mensagens para seus clientes</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Message Composer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Message Type Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone size={20} />
                                Compor Mensagem
                            </CardTitle>
                            <CardDescription>
                                Escolha o tipo e escreva sua mensagem
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
                                <TabsList className="grid grid-cols-3 mb-4">
                                    <TabsTrigger value="promotional" className="flex items-center gap-2">
                                        <Gift size={16} />
                                        Promoção
                                    </TabsTrigger>
                                    <TabsTrigger value="informative" className="flex items-center gap-2">
                                        <Bell size={16} />
                                        Informativo
                                    </TabsTrigger>
                                    <TabsTrigger value="coupon" className="flex items-center gap-2">
                                        <Gift size={16} />
                                        Cupom
                                    </TabsTrigger>
                                </TabsList>

                                <div className="space-y-4">
                                    {/* Templates */}
                                    <div>
                                        <Label className="text-sm text-muted-foreground mb-2 block">Templates Rápidos</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {messageTemplates[messageType].map((template, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => applyTemplate(template)}
                                                >
                                                    {template.title}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título (opcional)</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Ex: Promoção de Natal"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Mensagem *</Label>
                                        <textarea
                                            id="message"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Digite sua mensagem aqui... Use {nome} para personalizar com o nome do cliente."
                                            className="w-full min-h-[150px] p-3 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground resize-none"
                                            maxLength={1000}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            💡 Use <code className="bg-secondary px-1 rounded">{'{nome}'}</code> para personalizar com o nome do cliente
                                        </p>
                                    </div>

                                    {/* Send Via */}
                                    <div className="space-y-2">
                                        <Label>Enviar via</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={sendVia.whatsapp}
                                                    onCheckedChange={(checked) => setSendVia({ ...sendVia, whatsapp: !!checked })}
                                                />
                                                <MessageCircle size={16} className="text-green-500" />
                                                <span>WhatsApp</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer opacity-50" title="Requer backend">
                                                <Checkbox
                                                    checked={sendVia.push}
                                                    onCheckedChange={(checked) => setSendVia({ ...sendVia, push: !!checked })}
                                                    disabled
                                                />
                                                <Bell size={16} className="text-blue-500" />
                                                <span>Push (em breve)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Send Button */}
                    <Button
                        onClick={handleSendNotification}
                        disabled={sending || selectedClients.length === 0 || !message.trim()}
                        className="w-full py-6 text-lg"
                        size="lg"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={20} className="mr-2" />
                                Enviar para {selectedClients.length} cliente(s)
                            </>
                        )}
                    </Button>
                </div>

                {/* Right: Client Selection */}
                <div>
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users size={20} />
                                Selecionar Clientes
                            </CardTitle>
                            <CardDescription>
                                {clients.length} clientes cadastrados
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Select All */}
                            <label className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors">
                                <Checkbox
                                    checked={selectAll}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                />
                                <span className="font-medium">Selecionar todos com telefone</span>
                            </label>

                            {/* Client List */}
                            <div className="max-h-[400px] overflow-y-auto space-y-2">
                                {clients.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Nenhum cliente cadastrado ainda
                                    </p>
                                ) : (
                                    clients.map((client) => (
                                        <label
                                            key={client.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedClients.includes(client.id)
                                                    ? 'bg-primary/10 border border-primary/30'
                                                    : 'bg-secondary/30 hover:bg-secondary/50'
                                                } ${!client.phone ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Checkbox
                                                checked={selectedClients.includes(client.id)}
                                                onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)}
                                                disabled={!client.phone}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate">{client.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {client.phone || 'Sem telefone'}
                                                    {client.total_visits ? ` • ${client.total_visits} visitas` : ''}
                                                </p>
                                            </div>
                                            {selectedClients.includes(client.id) && (
                                                <CheckCircle size={16} className="text-primary flex-shrink-0" />
                                            )}
                                        </label>
                                    ))
                                )}
                            </div>

                            {/* Stats */}
                            <div className="pt-4 border-t border-border">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Selecionados:</span>
                                    <span className="font-bold text-primary">{selectedClients.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Com telefone:</span>
                                    <span className="font-medium">{clients.filter(c => c.phone).length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Marketing;
