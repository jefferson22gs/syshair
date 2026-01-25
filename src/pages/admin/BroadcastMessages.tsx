import { useState, useEffect } from "react";
import {
    Send,
    Users,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Loader2,
    MessageSquare,
    Plus,
    Trash2,
    RefreshCw,
    Upload,
    Shield,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Contact {
    id?: string;
    phone: string;
    name: string;
    source: 'database' | 'whatsapp' | 'manual';
    selected?: boolean;
}

interface Broadcast {
    id: string;
    message: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: string;
    created_at: string;
    completed_at?: string;
}

const BroadcastMessages = () => {
    const { toast } = useToast();
    const [salonId, setSalonId] = useState<string | null>(null);
    const [instanceName, setInstanceName] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Estados de contatos
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);

    // Estados do disparo
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

    // Estados de modais
    const [showAddManual, setShowAddManual] = useState(false);
    const [manualNumbers, setManualNumbers] = useState("");

    // Estados de estatísticas
    const [todayStats, setTodayStats] = useState({ sent: 0, limit: 500, remaining: 500 });

    useEffect(() => {
        loadUserData();
    }, []);

    useEffect(() => {
        if (salonId) {
            loadBroadcasts();
            loadTodayStats();
        }
    }, [salonId]);

    useEffect(() => {
        // Filtrar contatos
        const filtered = contacts.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm)
        );
        setFilteredContacts(filtered);
    }, [searchTerm, contacts]);

    useEffect(() => {
        // Contar selecionados
        const count = contacts.filter(c => c.selected).length;
        setSelectedCount(count);
    }, [contacts]);

    const loadUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: salon } = await supabase
            .from("salons")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        if (salon) {
            setSalonId(salon.id);

            // Verificar instância conectada
            const { data: instance } = await supabase
                .from("whatsapp_instances")
                .select("instance_name, status")
                .eq("salon_id", salon.id)
                .single();

            if (instance) {
                setInstanceName(instance.instance_name);
                setIsConnected(instance.status === "connected");
            }
        }
    };

    const loadContacts = async () => {
        if (!salonId || !instanceName) return;

        setLoadingContacts(true);
        try {
            const response = await supabase.functions.invoke('broadcast-messages', {
                body: {
                    action: 'fetch_contacts',
                    salonId,
                    instanceName
                }
            });

            if (response.error) throw new Error(response.error.message);

            if (response.data?.contacts) {
                const contactsWithSelection = response.data.contacts.map((c: Contact) => ({
                    ...c,
                    selected: false
                }));
                setContacts(contactsWithSelection);
                setFilteredContacts(contactsWithSelection);

                toast({
                    title: "Contatos carregados",
                    description: `${response.data.stats.total} contatos encontrados (${response.data.stats.fromDatabase} do sistema, ${response.data.stats.fromWhatsApp} do WhatsApp)`,
                });
            }
        } catch (error: any) {
            console.error("Error loading contacts:", error);
            toast({
                title: "Erro ao carregar contatos",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingContacts(false);
        }
    };

    const loadBroadcasts = async () => {
        if (!salonId) return;

        const { data } = await supabase
            .from("broadcasts")
            .select("*")
            .eq("salon_id", salonId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (data) {
            setBroadcasts(data);
        }
    };

    const loadTodayStats = async () => {
        if (!salonId) return;

        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from("broadcast_messages")
            .select("id")
            .eq("salon_id", salonId)
            .gte("created_at", `${today}T00:00:00`)
            .eq("status", "sent");

        const sent = data?.length || 0;
        setTodayStats({
            sent,
            limit: 500,
            remaining: Math.max(0, 500 - sent)
        });
    };

    const toggleContact = (phone: string) => {
        setContacts(prev => prev.map(c =>
            c.phone === phone ? { ...c, selected: !c.selected } : c
        ));
    };

    const toggleAll = (selected: boolean) => {
        setContacts(prev => prev.map(c => ({ ...c, selected })));
    };

    const addManualContacts = () => {
        const numbers = manualNumbers
            .split(/[\n,;]/)
            .map(n => n.trim().replace(/\D/g, ""))
            .filter(n => n.length >= 10);

        const existingPhones = new Set(contacts.map(c => c.phone));
        const newContacts: Contact[] = [];

        for (const phone of numbers) {
            if (!existingPhones.has(phone)) {
                newContacts.push({
                    phone,
                    name: `+${phone}`,
                    source: 'manual',
                    selected: true
                });
                existingPhones.add(phone);
            }
        }

        if (newContacts.length > 0) {
            setContacts(prev => [...prev, ...newContacts]);
            toast({
                title: "Contatos adicionados",
                description: `${newContacts.length} números adicionados`,
            });
        }

        setManualNumbers("");
        setShowAddManual(false);
    };

    const sendBroadcast = async () => {
        const selectedContacts = contacts.filter(c => c.selected);

        if (selectedContacts.length === 0) {
            toast({
                title: "Nenhum contato selecionado",
                description: "Selecione pelo menos um contato para enviar.",
                variant: "destructive",
            });
            return;
        }

        if (!message.trim()) {
            toast({
                title: "Mensagem vazia",
                description: "Digite uma mensagem para enviar.",
                variant: "destructive",
            });
            return;
        }

        if (selectedContacts.length > todayStats.remaining) {
            toast({
                title: "Limite diário excedido",
                description: `Você pode enviar mais ${todayStats.remaining} mensagens hoje.`,
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            const response = await supabase.functions.invoke('broadcast-messages', {
                body: {
                    action: 'send_broadcast',
                    salonId,
                    instanceName,
                    message: message.trim(),
                    recipients: selectedContacts.map(c => c.phone)
                }
            });

            if (response.error) throw new Error(response.error.message);

            if (response.data?.success) {
                toast({
                    title: "🚀 Disparo iniciado!",
                    description: response.data.message,
                });

                // Limpar seleção
                setContacts(prev => prev.map(c => ({ ...c, selected: false })));
                setMessage("");

                // Recarregar histórico
                setTimeout(() => {
                    loadBroadcasts();
                    loadTodayStats();
                }, 2000);
            }
        } catch (error: any) {
            console.error("Error sending broadcast:", error);
            toast({
                title: "Erro ao enviar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-500/20 text-green-400"><CheckCircle size={12} className="mr-1" /> Concluído</Badge>;
            case 'processing':
                return <Badge className="bg-blue-500/20 text-blue-400"><Loader2 size={12} className="mr-1 animate-spin" /> Enviando</Badge>;
            case 'stopped':
                return <Badge className="bg-orange-500/20 text-orange-400"><AlertTriangle size={12} className="mr-1" /> Parado</Badge>;
            case 'failed':
                return <Badge className="bg-red-500/20 text-red-400"><XCircle size={12} className="mr-1" /> Falhou</Badge>;
            default:
                return <Badge className="bg-gray-500/20 text-gray-400"><Clock size={12} className="mr-1" /> Pendente</Badge>;
        }
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'database':
                return <Badge variant="outline" className="text-xs">Cliente</Badge>;
            case 'whatsapp':
                return <Badge variant="outline" className="text-xs text-green-400 border-green-400">WhatsApp</Badge>;
            case 'manual':
                return <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">Manual</Badge>;
            default:
                return null;
        }
    };

    if (!isConnected) {
        return (
            <AdminLayout>
                <div className="container py-8">
                    <Alert className="bg-yellow-500/10 border-yellow-500/30">
                        <AlertTriangle className="text-yellow-500" />
                        <AlertDescription className="text-yellow-200">
                            Conecte seu WhatsApp primeiro para usar o disparador de mensagens.
                            <Button variant="link" className="text-primary ml-2" onClick={() => window.location.href = '/admin/whatsapp'}>
                                Conectar WhatsApp →
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container py-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
                            <Send className="text-primary" />
                            Disparador de Mensagens
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Envie mensagens para seus clientes de forma segura
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Limite diário</p>
                            <p className="text-lg font-semibold">
                                <span className="text-primary">{todayStats.remaining}</span>
                                <span className="text-muted-foreground">/{todayStats.limit}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alerta de proteção */}
                <Alert className="bg-primary/10 border-primary/30">
                    <Shield className="text-primary" />
                    <AlertDescription>
                        <strong>Proteção ativa:</strong> Suas mensagens são enviadas com intervalo de 4 segundos e pausas a cada 30 mensagens para evitar bloqueios do WhatsApp.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna de contatos */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="glass-card">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <Users size={20} />
                                        Contatos ({contacts.length})
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAddManual(true)}
                                        >
                                            <Plus size={16} className="mr-1" />
                                            Adicionar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={loadContacts}
                                            disabled={loadingContacts}
                                        >
                                            {loadingContacts ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={16} />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    {selectedCount > 0 ? (
                                        <span className="text-primary font-medium">{selectedCount} selecionados</span>
                                    ) : (
                                        "Selecione os contatos que receberão a mensagem"
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Busca e ações */}
                                <div className="flex gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por nome ou telefone..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleAll(true)}
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleAll(false)}
                                    >
                                        Nenhum
                                    </Button>
                                </div>

                                {/* Lista de contatos */}
                                {contacts.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Nenhum contato carregado</p>
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={loadContacts}
                                            disabled={loadingContacts}
                                        >
                                            {loadingContacts ? (
                                                <>
                                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                                    Carregando...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw size={16} className="mr-2" />
                                                    Carregar Contatos
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="max-h-[400px] overflow-y-auto space-y-1">
                                        {filteredContacts.map((contact) => (
                                            <div
                                                key={contact.phone}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${contact.selected
                                                        ? 'bg-primary/20 border border-primary/30'
                                                        : 'bg-surface-1 hover:bg-surface-2'
                                                    }`}
                                                onClick={() => toggleContact(contact.phone)}
                                            >
                                                <Checkbox
                                                    checked={contact.selected}
                                                    onCheckedChange={() => toggleContact(contact.phone)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{contact.name}</p>
                                                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                                </div>
                                                {getSourceBadge(contact.source)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Coluna de mensagem */}
                    <div className="space-y-4">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare size={20} />
                                    Mensagem
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Digite sua mensagem aqui..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                    className="resize-none"
                                />
                                <div className="text-sm text-muted-foreground">
                                    {message.length} caracteres
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={sendBroadcast}
                                    disabled={isSending || selectedCount === 0 || !message.trim()}
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 size={18} className="mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} className="mr-2" />
                                            Enviar para {selectedCount} contatos
                                        </>
                                    )}
                                </Button>

                                {selectedCount > 0 && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        Tempo estimado: ~{Math.ceil((selectedCount * 4) / 60)} minutos
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Histórico */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg">Histórico de Disparos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {broadcasts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Nenhum disparo realizado
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {broadcasts.slice(0, 5).map((broadcast) => (
                                            <div
                                                key={broadcast.id}
                                                className="p-3 bg-surface-1 rounded-lg"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    {getStatusBadge(broadcast.status)}
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(broadcast.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <p className="text-sm line-clamp-2 mb-2">{broadcast.message}</p>
                                                <div className="flex gap-4 text-xs text-muted-foreground">
                                                    <span className="text-green-400">✓ {broadcast.sent_count || 0}</span>
                                                    <span className="text-red-400">✗ {broadcast.failed_count || 0}</span>
                                                    <span>Total: {broadcast.total_recipients}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Modal adicionar números */}
                <Dialog open={showAddManual} onOpenChange={setShowAddManual}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Números Manualmente</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Números de telefone</Label>
                                <Textarea
                                    placeholder="Cole os números aqui (um por linha ou separados por vírgula)&#10;&#10;Exemplo:&#10;5511999999999&#10;5521888888888"
                                    value={manualNumbers}
                                    onChange={(e) => setManualNumbers(e.target.value)}
                                    rows={6}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Use o formato com código do país (ex: 5511999999999)
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddManual(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={addManualContacts}>
                                Adicionar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default BroadcastMessages;
