import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    Search,
    Eye,
    Settings,
    Crown,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BarChart3,
    Loader2,
    RefreshCw,
    Shield,
    Smartphone,
    Bot,
    MessageSquare,
    LogOut
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Email do Super Admin (você!)
const SUPER_ADMIN_EMAILS = [
    "jefferson22gs@gmail.com",
    "admin@syshair.com"
];

interface Salon {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    owner_email?: string;
    owner_name?: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    is_active: boolean;
    public_booking_enabled: boolean;
    created_at: string;
    subscription_status?: string;
    subscription_plan?: string;
    trial_ends_at?: string;
    appointments_count?: number;
    clients_count?: number;
    professionals_count?: number;
    whatsapp_connected?: boolean;
    chatbot_enabled?: boolean;
}

interface DashboardStats {
    totalSalons: number;
    activeSalons: number;
    totalAppointments: number;
    totalClients: number;
    totalProfessionals: number;
    trialSalons: number;
    paidSalons: number;
    monthlyRevenue: number;
    newSalonsThisMonth: number;
    appointmentsThisMonth: number;
}

const SuperAdmin = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [salons, setSalons] = useState<Salon[]>([]);
    const [filteredSalons, setFilteredSalons] = useState<Salon[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
    const [showSalonDetails, setShowSalonDetails] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkAuthorization();
    }, []);

    useEffect(() => {
        filterSalons();
    }, [searchTerm, statusFilter, salons]);

    const checkAuthorization = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !SUPER_ADMIN_EMAILS.includes(user.email || "")) {
                toast({
                    title: "Acesso negado",
                    description: "Você não tem permissão para acessar esta página.",
                    variant: "destructive",
                });
                navigate("/");
                return;
            }

            setAuthorized(true);
            await loadData();
        } catch (error) {
            console.error("Auth error:", error);
            navigate("/login");
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setRefreshing(true);
        try {
            // Carregar todos os salões
            const { data: salonsData, error: salonsError } = await supabase
                .from("salons")
                .select("*")
                .order("created_at", { ascending: false });

            if (salonsError) {
                console.error("Error loading salons:", salonsError);
                throw salonsError;
            }

            // Enriquecer dados dos salões (com tratamento de erro individual)
            const enrichedSalons = await Promise.all(
                (salonsData || []).map(async (salon: any) => {
                    let appointmentsCount = 0;
                    let clientsCount = 0;
                    let professionalsCount = 0;
                    let whatsappConnected = false;
                    let chatbotEnabled = false;
                    let subscriptionStatus = "trial";
                    let subscriptionPlan = "free";

                    try {
                        const { count } = await supabase
                            .from("appointments")
                            .select("*", { count: "exact", head: true })
                            .eq("salon_id", salon.id);
                        appointmentsCount = count || 0;
                    } catch (e) { /* ignore */ }

                    try {
                        const { count } = await supabase
                            .from("clients")
                            .select("*", { count: "exact", head: true })
                            .eq("salon_id", salon.id);
                        clientsCount = count || 0;
                    } catch (e) { /* ignore */ }

                    try {
                        const { count } = await supabase
                            .from("professionals")
                            .select("*", { count: "exact", head: true })
                            .eq("salon_id", salon.id);
                        professionalsCount = count || 0;
                    } catch (e) { /* ignore */ }

                    try {
                        const { data: whatsapp } = await supabase
                            .from("whatsapp_instances")
                            .select("status")
                            .eq("salon_id", salon.id)
                            .maybeSingle();
                        whatsappConnected = whatsapp?.status === "connected";
                    } catch (e) { /* ignore */ }

                    try {
                        const { data: chatbot } = await supabase
                            .from("chatbot_settings")
                            .select("enabled")
                            .eq("salon_id", salon.id)
                            .maybeSingle();
                        chatbotEnabled = chatbot?.enabled || false;
                    } catch (e) { /* ignore */ }

                    try {
                        const { data: subscription } = await supabase
                            .from("subscriptions")
                            .select("status, plan_id")
                            .eq("salon_id", salon.id)
                            .maybeSingle();
                        if (subscription) {
                            subscriptionStatus = subscription.status || "trial";
                            subscriptionPlan = subscription.plan_id || "free";
                        }
                    } catch (e) { /* ignore */ }

                    return {
                        ...salon,
                        owner_email: salon.owner_email || "",
                        owner_name: salon.owner_name || "",
                        appointments_count: appointmentsCount,
                        clients_count: clientsCount,
                        professionals_count: professionalsCount,
                        whatsapp_connected: whatsappConnected,
                        chatbot_enabled: chatbotEnabled,
                        subscription_status: subscriptionStatus,
                        subscription_plan: subscriptionPlan,
                    };
                })
            );

            setSalons(enrichedSalons);

            // Calcular estatísticas
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const newSalonsThisMonth = enrichedSalons.filter(
                s => new Date(s.created_at) >= startOfMonth
            ).length;

            // Totais (calculados dos salões carregados)
            const totalAppointments = enrichedSalons.reduce((acc, s) => acc + (s.appointments_count || 0), 0);
            const totalClients = enrichedSalons.reduce((acc, s) => acc + (s.clients_count || 0), 0);
            const totalProfessionals = enrichedSalons.reduce((acc, s) => acc + (s.professionals_count || 0), 0);

            setStats({
                totalSalons: enrichedSalons.length,
                activeSalons: enrichedSalons.filter(s => s.is_active !== false).length,
                totalAppointments,
                totalClients,
                totalProfessionals,
                trialSalons: enrichedSalons.filter(s => s.subscription_status === "trial").length,
                paidSalons: enrichedSalons.filter(s => s.subscription_status === "active").length,
                monthlyRevenue: 0,
                newSalonsThisMonth,
                appointmentsThisMonth: 0,
            });

        } catch (error) {
            console.error("Error loading data:", error);
            toast({
                title: "Erro ao carregar dados",
                description: "Verifique se você tem permissão de Super Admin.",
                variant: "destructive",
            });
        } finally {
            setRefreshing(false);
        }
    };

    const filterSalons = () => {
        let filtered = salons;

        // Filtro por busca
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.slug?.toLowerCase().includes(term) ||
                s.owner_email?.toLowerCase().includes(term) ||
                s.city?.toLowerCase().includes(term)
            );
        }

        // Filtro por status
        if (statusFilter !== "all") {
            switch (statusFilter) {
                case "active":
                    filtered = filtered.filter(s => s.is_active !== false);
                    break;
                case "inactive":
                    filtered = filtered.filter(s => s.is_active === false);
                    break;
                case "trial":
                    filtered = filtered.filter(s => s.subscription_status === "trial");
                    break;
                case "paid":
                    filtered = filtered.filter(s => s.subscription_status === "active");
                    break;
                case "whatsapp":
                    filtered = filtered.filter(s => s.whatsapp_connected);
                    break;
                case "chatbot":
                    filtered = filtered.filter(s => s.chatbot_enabled);
                    break;
            }
        }

        setFilteredSalons(filtered);
    };

    const getSubscriptionBadge = (status: string | undefined, plan: string | undefined) => {
        if (status === "active") {
            return <Badge className="bg-green-500/20 text-green-400">Ativo - {plan}</Badge>;
        }
        if (status === "trial") {
            return <Badge className="bg-yellow-500/20 text-yellow-400">Trial</Badge>;
        }
        if (status === "canceled") {
            return <Badge className="bg-red-500/20 text-red-400">Cancelado</Badge>;
        }
        return <Badge className="bg-gray-500/20 text-gray-400">Free</Badge>;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!authorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-surface-1 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="font-display text-xl font-bold">SysHair Super Admin</h1>
                            <p className="text-xs text-muted-foreground">Painel de Administração Master</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadData}
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                        <Building2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.totalSalons}</p>
                                        <p className="text-xs text-muted-foreground">Salões</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/20">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.activeSalons}</p>
                                        <p className="text-xs text-muted-foreground">Ativos</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-yellow-500/20">
                                        <Clock className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.trialSalons}</p>
                                        <p className="text-xs text-muted-foreground">Trial</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/20">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                                        <p className="text-xs text-muted-foreground">Agendamentos</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/20">
                                        <Users className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.totalClients}</p>
                                        <p className="text-xs text-muted-foreground">Clientes</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/20">
                                        <TrendingUp className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">+{stats.newSalonsThisMonth}</p>
                                        <p className="text-xs text-muted-foreground">Este mês</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome, slug, email ou cidade..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Filtrar por..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Ativos</SelectItem>
                                    <SelectItem value="inactive">Inativos</SelectItem>
                                    <SelectItem value="trial">Em Trial</SelectItem>
                                    <SelectItem value="paid">Pagantes</SelectItem>
                                    <SelectItem value="whatsapp">Com WhatsApp</SelectItem>
                                    <SelectItem value="chatbot">Com Chatbot IA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Salons Table */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Salões Cadastrados ({filteredSalons.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Salão</TableHead>
                                        <TableHead>Proprietário</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Recursos</TableHead>
                                        <TableHead className="text-right">Métricas</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSalons.map((salon) => (
                                        <TableRow key={salon.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{salon.name}</p>
                                                    <p className="text-xs text-muted-foreground">/{salon.slug}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm">{salon.owner_name || "—"}</p>
                                                    <p className="text-xs text-muted-foreground">{salon.owner_email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm">
                                                    {salon.city ? `${salon.city}/${salon.state}` : "—"}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {getSubscriptionBadge(salon.subscription_status, salon.subscription_plan)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {salon.whatsapp_connected && (
                                                        <Badge variant="outline" className="text-green-400 border-green-400">
                                                            <Smartphone className="w-3 h-3 mr-1" />
                                                            WhatsApp
                                                        </Badge>
                                                    )}
                                                    {salon.chatbot_enabled && (
                                                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                                                            <Bot className="w-3 h-3 mr-1" />
                                                            IA
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-4 justify-end text-sm">
                                                    <span title="Agendamentos">
                                                        <Calendar className="w-4 h-4 inline mr-1" />
                                                        {salon.appointments_count}
                                                    </span>
                                                    <span title="Clientes">
                                                        <Users className="w-4 h-4 inline mr-1" />
                                                        {salon.clients_count}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedSalon(salon);
                                                        setShowSalonDetails(true);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Salon Details Modal */}
            <Dialog open={showSalonDetails} onOpenChange={setShowSalonDetails}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {selectedSalon?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSalon && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Slug</p>
                                    <p className="font-medium">/s/{selectedSalon.slug}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Criado em</p>
                                    <p className="font-medium">
                                        {format(new Date(selectedSalon.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Proprietário</p>
                                    <p className="font-medium">{selectedSalon.owner_name || "—"}</p>
                                    <p className="text-xs text-muted-foreground">{selectedSalon.owner_email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Telefone</p>
                                    <p className="font-medium">{selectedSalon.phone || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Localização</p>
                                    <p className="font-medium">
                                        {selectedSalon.city ? `${selectedSalon.city}/${selectedSalon.state}` : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    {getSubscriptionBadge(selectedSalon.subscription_status, selectedSalon.subscription_plan)}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-3">Métricas</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-surface-1 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{selectedSalon.appointments_count}</p>
                                        <p className="text-xs text-muted-foreground">Agendamentos</p>
                                    </div>
                                    <div className="text-center p-3 bg-surface-1 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{selectedSalon.clients_count}</p>
                                        <p className="text-xs text-muted-foreground">Clientes</p>
                                    </div>
                                    <div className="text-center p-3 bg-surface-1 rounded-lg">
                                        <p className="text-2xl font-bold text-primary">{selectedSalon.professionals_count}</p>
                                        <p className="text-xs text-muted-foreground">Profissionais</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-3">Recursos Ativos</p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={selectedSalon.public_booking_enabled ? "default" : "outline"}>
                                        {selectedSalon.public_booking_enabled ? "✓" : "✗"} Booking Público
                                    </Badge>
                                    <Badge variant={selectedSalon.whatsapp_connected ? "default" : "outline"}>
                                        {selectedSalon.whatsapp_connected ? "✓" : "✗"} WhatsApp
                                    </Badge>
                                    <Badge variant={selectedSalon.chatbot_enabled ? "default" : "outline"}>
                                        {selectedSalon.chatbot_enabled ? "✓" : "✗"} Chatbot IA
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(`/s/${selectedSalon.slug}`, "_blank")}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Página Pública
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SuperAdmin;
