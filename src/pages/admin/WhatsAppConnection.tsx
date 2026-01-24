import { useState, useEffect } from "react";
import {
    Smartphone,
    QrCode,
    RefreshCw,
    CheckCircle,
    XCircle,
    Loader2,
    Wifi,
    WifiOff,
    MessageSquare,
    Settings,
    Trash2,
    Power,
    Copy,
    ExternalLink,
    AlertCircle,
    Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Configuração da Evolution API
const EVOLUTION_API_URL = 'https://api.tubaraoemprestimo.com.br';
const EVOLUTION_API_KEY = 'B8959800-F546-407C-99E8-C40306E747F5';

interface WhatsAppInstance {
    id?: string;
    salon_id: string;
    instance_name: string;
    instance_token?: string;
    status: 'disconnected' | 'connecting' | 'connected' | 'qrcode';
    qrcode?: string;
    phone_number?: string;
    webhook_url?: string;
}

const WhatsAppConnection = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [salonId, setSalonId] = useState<string | null>(null);
    const [salonName, setSalonName] = useState('');

    // Estados da instância
    const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    // Modal de criação
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [instanceName, setInstanceName] = useState('');

    // Carregar dados iniciais
    useEffect(() => {
        loadData();
    }, []);

    // Polling para verificar status
    useEffect(() => {
        if (instance?.status === 'qrcode' || instance?.status === 'connecting') {
            const interval = setInterval(() => {
                checkInstanceStatus();
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [instance?.status]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: salon } = await supabase
                .from('salons')
                .select('id, name')
                .eq('owner_id', user.id)
                .single();

            if (!salon) return;
            setSalonId(salon.id);
            setSalonName(salon.name);

            // Gerar nome da instância baseado no salão
            const safeName = salon.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
            setInstanceName(`syshair_${safeName}_${salon.id.substring(0, 8)}`);

            // Buscar instância existente
            const { data: instanceData } = await supabase
                .from('whatsapp_instances')
                .select('*')
                .eq('salon_id', salon.id)
                .single();

            if (instanceData) {
                setInstance(instanceData as WhatsAppInstance);
                // Verificar status atual na Evolution API
                await checkInstanceStatus(instanceData.instance_name);
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkInstanceStatus = async (name?: string) => {
        const instanceName = name || instance?.instance_name;
        if (!instanceName) return;

        try {
            const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const state = data.instance?.state || 'close';

                let newStatus: WhatsAppInstance['status'] = 'disconnected';
                if (state === 'open') newStatus = 'connected';
                else if (state === 'connecting') newStatus = 'connecting';
                else if (state === 'close') newStatus = 'disconnected';

                // Atualizar no banco se mudou
                if (instance && instance.status !== newStatus) {
                    await supabase
                        .from('whatsapp_instances')
                        .update({ status: newStatus, updated_at: new Date().toISOString() })
                        .eq('id', instance.id);

                    setInstance(prev => prev ? { ...prev, status: newStatus } : null);
                }

                // Se conectado, buscar número
                if (newStatus === 'connected') {
                    await fetchConnectedNumber(instanceName);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    };

    const fetchConnectedNumber = async (instanceName: string) => {
        try {
            const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const phoneNumber = data[0]?.instance?.owner?.split('@')[0];

                if (phoneNumber && instance) {
                    await supabase
                        .from('whatsapp_instances')
                        .update({ phone_number: phoneNumber })
                        .eq('id', instance.id);

                    setInstance(prev => prev ? { ...prev, phone_number: phoneNumber } : null);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar número:', error);
        }
    };

    const createInstance = async () => {
        if (!salonId || !instanceName.trim()) return;
        setIsCreating(true);

        try {
            // Criar instância na Evolution API
            const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY,
                },
                body: JSON.stringify({
                    instanceName: instanceName,
                    integration: 'WHATSAPP-BAILEYS',
                    qrcode: true,
                    // Webhook para receber mensagens
                    webhook: {
                        enabled: true,
                        url: `${window.location.origin}/api/evolution-webhook`,
                        webhookByEvents: true,
                        events: [
                            'MESSAGES_UPSERT',
                            'MESSAGES_UPDATE',
                            'CONNECTION_UPDATE',
                        ],
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao criar instância');
            }

            const data = await response.json();

            // Salvar no banco
            const newInstance: Omit<WhatsAppInstance, 'id'> = {
                salon_id: salonId,
                instance_name: instanceName,
                instance_token: data.hash,
                status: 'disconnected',
                webhook_url: `${window.location.origin}/api/evolution-webhook`,
            };

            const { data: savedInstance, error } = await supabase
                .from('whatsapp_instances')
                .insert(newInstance)
                .select()
                .single();

            if (error) throw error;

            setInstance(savedInstance as WhatsAppInstance);
            setShowCreateModal(false);

            toast({
                title: "Instância criada!",
                description: "Agora você pode conectar seu WhatsApp.",
            });

        } catch (error: any) {
            toast({
                title: "Erro ao criar instância",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const connectInstance = async () => {
        if (!instance) return;
        setIsConnecting(true);
        setQrCode(null);

        try {
            const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instance.instance_name}`, {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                },
            });

            if (!response.ok) {
                throw new Error('Erro ao gerar QR Code');
            }

            const data = await response.json();

            if (data.base64) {
                setQrCode(data.base64);
                setInstance(prev => prev ? { ...prev, status: 'qrcode' } : null);

                await supabase
                    .from('whatsapp_instances')
                    .update({ status: 'qrcode', qrcode: data.base64 })
                    .eq('id', instance.id);
            }

        } catch (error: any) {
            toast({
                title: "Erro ao conectar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectInstance = async () => {
        if (!instance) return;
        setIsDisconnecting(true);

        try {
            await fetch(`${EVOLUTION_API_URL}/instance/logout/${instance.instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                },
            });

            await supabase
                .from('whatsapp_instances')
                .update({ status: 'disconnected', phone_number: null, qrcode: null })
                .eq('id', instance.id);

            setInstance(prev => prev ? { ...prev, status: 'disconnected', phone_number: undefined } : null);
            setQrCode(null);

            toast({
                title: "Desconectado",
                description: "WhatsApp foi desconectado com sucesso.",
            });

        } catch (error: any) {
            toast({
                title: "Erro ao desconectar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDisconnecting(false);
        }
    };

    const deleteInstance = async () => {
        if (!instance) return;

        if (!confirm('Tem certeza que deseja excluir esta instância? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            // Deletar na Evolution API
            await fetch(`${EVOLUTION_API_URL}/instance/delete/${instance.instance_name}`, {
                method: 'DELETE',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                },
            });

            // Deletar no banco
            await supabase
                .from('whatsapp_instances')
                .delete()
                .eq('id', instance.id);

            setInstance(null);
            setQrCode(null);

            toast({
                title: "Instância excluída",
                description: "A instância foi removida com sucesso.",
            });

        } catch (error: any) {
            toast({
                title: "Erro ao excluir",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
    };

    const getStatusInfo = () => {
        switch (instance?.status) {
            case 'connected':
                return {
                    icon: CheckCircle,
                    color: 'text-green-500',
                    bg: 'bg-green-500/20',
                    border: 'border-green-500/30',
                    label: 'Conectado',
                };
            case 'connecting':
            case 'qrcode':
                return {
                    icon: Loader2,
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/20',
                    border: 'border-yellow-500/30',
                    label: 'Aguardando conexão',
                };
            default:
                return {
                    icon: XCircle,
                    color: 'text-red-500',
                    bg: 'bg-red-500/20',
                    border: 'border-red-500/30',
                    label: 'Desconectado',
                };
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    const statusInfo = getStatusInfo();

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Smartphone className="w-8 h-8 text-primary" />
                        Conexão WhatsApp
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Conecte seu WhatsApp para usar o chatbot IA e agendar posts
                    </p>
                </div>

                {/* Sem instância - Criar */}
                {!instance ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                                <MessageSquare className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Nenhuma instância configurada</h3>
                            <p className="text-muted-foreground text-center mb-6 max-w-md">
                                Crie uma instância do WhatsApp para começar a usar o chatbot IA
                                e o agendador de posts.
                            </p>
                            <Button variant="gold" size="lg" onClick={() => setShowCreateModal(true)}>
                                <Smartphone className="w-5 h-5 mr-2" />
                                Criar Instância WhatsApp
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Status da Conexão */}
                        <Card className={cn("border-2", statusInfo.border)}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", statusInfo.bg)}>
                                            <statusInfo.icon className={cn("w-8 h-8", statusInfo.color, instance.status === 'connecting' && "animate-spin")} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">{statusInfo.label}</h3>
                                            {instance.phone_number ? (
                                                <p className="text-muted-foreground flex items-center gap-2">
                                                    <Phone size={14} />
                                                    +{instance.phone_number}
                                                </p>
                                            ) : (
                                                <p className="text-muted-foreground">
                                                    {instance.instance_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {instance.status === 'connected' ? (
                                            <Button
                                                variant="destructive"
                                                onClick={disconnectInstance}
                                                disabled={isDisconnecting}
                                            >
                                                {isDisconnecting ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <WifiOff className="w-4 h-4 mr-2" />
                                                )}
                                                Desconectar
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="gold"
                                                onClick={connectInstance}
                                                disabled={isConnecting}
                                            >
                                                {isConnecting ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Wifi className="w-4 h-4 mr-2" />
                                                )}
                                                Conectar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* QR Code */}
                        {(instance.status === 'qrcode' || qrCode) && (
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle className="flex items-center justify-center gap-2">
                                        <QrCode className="w-5 h-5 text-primary" />
                                        Escaneie o QR Code
                                    </CardTitle>
                                    <CardDescription>
                                        Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e escaneie o código
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center pb-8">
                                    {qrCode ? (
                                        <div className="p-4 bg-white rounded-2xl">
                                            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                        </div>
                                    ) : (
                                        <div className="w-64 h-64 bg-secondary rounded-2xl flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Aguardando conexão...
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={connectInstance}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Gerar novo QR Code
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Informações da Instância */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-primary" />
                                    Informações da Instância
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs">Nome da Instância</Label>
                                        <div className="flex items-center gap-2">
                                            <Input value={instance.instance_name} readOnly className="font-mono text-sm" />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => copyToClipboard(instance.instance_name)}
                                            >
                                                <Copy size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    {instance.instance_token && (
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground text-xs">Token da Instância</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={instance.instance_token}
                                                    type="password"
                                                    readOnly
                                                    className="font-mono text-sm"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(instance.instance_token!)}
                                                >
                                                    <Copy size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {instance.webhook_url && (
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground text-xs">Webhook URL</Label>
                                        <div className="flex items-center gap-2">
                                            <Input value={instance.webhook_url} readOnly className="font-mono text-sm" />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => copyToClipboard(instance.webhook_url!)}
                                            >
                                                <Copy size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t flex justify-end">
                                    <Button
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        onClick={deleteInstance}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir Instância
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dicas */}
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-6">
                                <div className="flex gap-4">
                                    <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Dicas importantes</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• Mantenha seu celular conectado à internet</li>
                                            <li>• Não desconecte o WhatsApp Web enquanto o bot estiver ativo</li>
                                            <li>• Se desconectar, você precisará escanear o QR Code novamente</li>
                                            <li>• O chatbot responderá automaticamente quando ativado</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Modal de Criação */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Instância WhatsApp</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome da Instância</Label>
                                <Input
                                    value={instanceName}
                                    onChange={(e) => setInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    placeholder="nome_da_instancia"
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Apenas letras minúsculas, números e underscores
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                                <p className="text-sm font-medium">Ao criar a instância:</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>✓ Uma nova instância será criada na Evolution API</li>
                                    <li>✓ Você poderá conectar seu WhatsApp via QR Code</li>
                                    <li>✓ O chatbot IA poderá responder mensagens automaticamente</li>
                                    <li>✓ Você poderá agendar posts para o Status</li>
                                </ul>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="gold" onClick={createInstance} disabled={isCreating || !instanceName.trim()}>
                                {isCreating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Smartphone className="w-4 h-4 mr-2" />
                                )}
                                Criar Instância
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default WhatsAppConnection;
