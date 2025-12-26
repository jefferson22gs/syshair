import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Gift,
    Copy,
    Check,
    Share2,
    Users,
    TrendingUp,
    RefreshCw,
    Award,
    Star
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { referralService, ReferralCode, Referral } from "@/services/referralService";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
    id: string;
    name: string;
}

interface RealReferralProgramProps {
    salonId: string;
}

export const RealReferralProgram = ({ salonId }: RealReferralProgramProps) => {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [clientCode, setClientCode] = useState<ReferralCode | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        topReferrers: [] as Array<{ client_id: string; name: string; count: number }>
    });

    useEffect(() => {
        if (salonId) {
            loadData();
        }
    }, [salonId]);

    useEffect(() => {
        if (selectedClientId && salonId) {
            loadClientData(selectedClientId);
        }
    }, [selectedClientId, salonId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar clientes
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, name')
                .eq('salon_id', salonId)
                .order('name');

            setClients(clientsData || []);

            // Carregar estatísticas
            const statsData = await referralService.getStats(salonId);
            setStats(statsData);

            // Se tiver clientes, selecionar o primeiro
            if (clientsData && clientsData.length > 0) {
                setSelectedClientId(clientsData[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de indicações:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const loadClientData = async (clientId: string) => {
        try {
            // Buscar ou criar código de indicação
            const code = await referralService.getOrCreateCode(salonId, clientId);
            setClientCode(code);

            // Buscar indicações do cliente
            const referralsData = await referralService.getReferrals(salonId, clientId);
            setReferrals(referralsData);
        } catch (error) {
            console.error('Erro ao carregar dados do cliente:', error);
        }
    };

    const copyCode = async () => {
        if (clientCode?.code) {
            await navigator.clipboard.writeText(clientCode.code);
            setCopied(true);
            toast.success('Código copiado!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const copyLink = async () => {
        if (clientCode?.code) {
            const link = `${window.location.origin}/ref/${clientCode.code}`;
            await navigator.clipboard.writeText(link);
            toast.success('Link copiado!');
        }
    };

    const shareWhatsApp = () => {
        if (clientCode?.code) {
            const selectedClient = clients.find(c => c.id === selectedClientId);
            const message = `🎉 ${selectedClient?.name || 'Seu amigo'} está te indicando para o nosso salão!\n\nUse o código ${clientCode.code} e ganhe 10% de desconto na primeira visita!\n\n`;
            const link = `${window.location.origin}/ref/${clientCode.code}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message + link)}`, '_blank');
        }
    };

    const selectedClient = clients.find(c => c.id === selectedClientId);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Principal - Código do Cliente */}
            <Card className="glass-card overflow-hidden">
                {/* Seletor de Cliente */}
                <div className="p-4 border-b border-border">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Gradiente de fundo */}
                <div className="bg-gradient-to-br from-primary/20 via-green-500/20 to-emerald-500/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Gift className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-bold text-foreground">
                                Indique e Ganhe!
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Programa de indicações oficial
                            </p>
                        </div>
                    </div>

                    <p className="text-sm text-foreground mb-6">
                        {selectedClient?.name || 'O cliente'} ganha{' '}
                        <span className="font-bold text-primary">15% OFF</span> no próximo serviço.
                        O amigo indicado ganha{' '}
                        <span className="font-bold text-green-500">10% OFF</span> na primeira visita!
                    </p>

                    {/* Código de Indicação */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Código de indicação</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-primary/30">
                                    <p className="text-center font-mono text-2xl font-bold text-primary tracking-widest">
                                        {clientCode?.code || 'Gerando...'}
                                    </p>
                                </div>
                                <Button
                                    size="icon"
                                    onClick={copyCode}
                                    className="h-14 w-14"
                                    variant={copied ? "secondary" : "default"}
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Ou compartilhe o link</label>
                            <div className="flex gap-2 mt-1">
                                <Button variant="outline" onClick={copyLink} className="flex-1">
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar Link
                                </Button>
                                <Button onClick={shareWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Indicações do cliente selecionado */}
                    {referrals.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-foreground mb-3">
                                Indicações de {selectedClient?.name}
                            </h4>
                            <div className="space-y-2">
                                {referrals.slice(0, 3).map(ref => (
                                    <div
                                        key={ref.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-card/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                                {(ref.referee as any)?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm">{(ref.referee as any)?.name || 'Cliente'}</span>
                                        </div>
                                        <Badge variant={ref.status === 'rewarded' ? 'secondary' : 'outline'}>
                                            {ref.status === 'rewarded' ? 'Recompensado' : 'Pendente'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Estatísticas e Ranking */}
            <div className="space-y-6">
                {/* Estatísticas */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Estatísticas do Programa
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-xl bg-primary/10">
                                <p className="text-2xl font-bold text-primary">{stats.totalReferrals}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-yellow-500/10">
                                <p className="text-2xl font-bold text-yellow-500">{stats.pendingReferrals}</p>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-green-500/10">
                                <p className="text-2xl font-bold text-green-500">{stats.completedReferrals}</p>
                                <p className="text-xs text-muted-foreground">Concluídas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Indicadores */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" />
                            Top Indicadores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topReferrers.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma indicação ainda</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.topReferrers.map((referrer, index) => (
                                    <motion.div
                                        key={referrer.client_id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black' :
                                                    index === 1 ? 'bg-gray-400 text-black' :
                                                        index === 2 ? 'bg-amber-700 text-white' :
                                                            'bg-secondary text-foreground'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <span className="font-medium">{referrer.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-yellow-500" />
                                            <span className="font-bold">{referrer.count}</span>
                                            <span className="text-sm text-muted-foreground">indicações</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Como funciona */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Como funciona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    1
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    O cliente compartilha o código com amigos
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    2
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    O amigo usa o código no primeiro agendamento
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                    3
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Ambos ganham descontos automaticamente!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
