import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
    const { isSupported: pushSupported, permission: pushPermission, showNotification, requestPermission } = usePushNotifications();
    const [salon, setSalon] = useState<{ id: string; name: string; whatsapp: string | null } | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [pushSubscriptionsCount, setPushSubscriptionsCount] = useState(0);

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

            // Get push subscriptions count
            const { count, error: pushError } = await (supabase as any)
                .from('push_subscriptions')
                .select('*', { count: 'exact', head: true })
                .eq('salon_id', salonData.id)
                .eq('is_active', true);

            if (!pushError) {
                setPushSubscriptionsCount(count || 0);
            }

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
                // Try to send via Evolution API (connected WhatsApp instance)
                try {
                    // Get WhatsApp instance for this salon
                    const { data: whatsappInstance } = await supabase
                        .from('whatsapp_instances')
                        .select('instance_name, status')
                        .eq('salon_id', salon?.id)
                        .eq('status', 'connected')
                        .maybeSingle();

                    if (whatsappInstance) {
                        // Send via Evolution API in bulk
                        const phones: string[] = [];
                        const personalizedMessages: string[] = [];

                        for (const client of selectedClientData) {
                            if (client.phone) {
                                phones.push(client.phone);
                                personalizedMessages.push(
                                    message.replace('{nome}', client.name.split(' ')[0])
                                );
                            }
                        }

                        if (phones.length > 0) {
                            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
                            const SUPABASE_ANON_KEY_LOCAL = import.meta.env.VITE_SUPABASE_ANON_KEY;

                            const session = (await supabase.auth.getSession()).data.session;
                            const authToken = session?.access_token || SUPABASE_ANON_KEY_LOCAL;

                            const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-instances`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${authToken}`,
                                },
                                body: JSON.stringify({
                                    action: 'sendBulk',
                                    instanceName: whatsappInstance.instance_name,
                                    phones: phones,
                                    messages: personalizedMessages,
                                }),
                            });

                            const result = await response.json();

                            if (result.success) {
                                toast.success(
                                    `✅ ${result.sent} mensagem(ns) enviada(s) com sucesso!`,
                                    {
                                        description: result.failed > 0
                                            ? `${result.failed} falharam. Verifique se os números estão corretos.`
                                            : 'Todas as mensagens foram entregues.',
                                    }
                                );
                            } else {
                                throw new Error(result.error || 'Erro ao enviar mensagens');
                            }
                        }
                    } else {
                        // Fallback: open wa.me links (limited by browser popup blocking)
                        let openedCount = 0;
                        for (const client of selectedClientData) {
                            if (client.phone) {
                                const phone = client.phone.replace(/\D/g, '');
                                const personalizedMessage = message.replace('{nome}', client.name.split(' ')[0]);
                                const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(personalizedMessage)}`;

                                window.open(whatsappUrl, '_blank');
                                openedCount++;

                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }

                        toast.info(
                            `⚠️ WhatsApp não conectado na plataforma`,
                            {
                                description: `${openedCount} link(s) aberto(s) no navegador. Para envio automático, conecte seu WhatsApp na aba "WhatsApp".`,
                            }
                        );
                    }
                } catch (whatsappError: any) {
                    console.error('WhatsApp send error:', whatsappError);
                    toast.error("Erro ao enviar via WhatsApp: " + (whatsappError.message || whatsappError));
                }
            }

            if (sendVia.push) {
                // Send push notifications via Firebase Cloud Messaging
                try {
                    // Get anon key or session token for authentication
                    const session = (await supabase.auth.getSession()).data.session;
                    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

                    if (!authToken) {
                        throw new Error('Não autenticado. Faça login novamente.');
                    }

                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-fcm`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        },
                        body: JSON.stringify({
                            salon_id: salon?.id,
                            client_ids: selectedClients,
                            title: title || salon?.name || 'Nova mensagem',
                            body: message.replace('{nome}', 'Cliente'),
                        }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || `HTTP ${response.status}`);
                    }

                    if (data?.sent > 0) {
                        toast.success(`${data.sent} notificações push enviadas!`, {
                            description: `Para dispositivos que permitiram notificações.`
                        });
                    } else {
                        toast.info("Nenhum dispositivo encontrado para push", {
                            description: "Os clientes precisam instalar o app e permitir notificações."
                        });
                    }
                } catch (pushError: any) {
                    console.error('Push error:', pushError);
                    toast.error("Erro ao enviar push: " + (pushError.message || pushError));
                }
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
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={sendVia.push}
                                                    onCheckedChange={(checked) => setSendVia({ ...sendVia, push: !!checked })}
                                                    disabled={!pushSupported || pushSubscriptionsCount === 0}
                                                />
                                                <Bell size={16} className="text-blue-500" />
                                                <span>Push {pushSubscriptionsCount > 0 ? `(${pushSubscriptionsCount} dispositivos)` : '(0 dispositivos)'}</span>
                                            </label>
                                        </div>
                                        {pushSubscriptionsCount === 0 && (
                                            <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                                                ⚠️ Nenhum cliente permitiu notificações push ainda. Os clientes precisam acessar a página de agendamento ({salon?.name && <span className="text-primary">/s/{salon.name.toLowerCase().replace(/\s+/g, '')}</span>}) e clicar em "Ativar notificações".
                                            </p>
                                        )}
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
