import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Download,
    FileText,
    Users,
    Loader2,
    CheckCircle2,
    FileSpreadsheet
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Client {
    id: string;
    name: string;
    phone: string;
    email?: string;
    birth_date?: string;
    preferences?: any;
    created_at: string;
}

export default function ExportContacts() {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'vcf' | 'csv'>('vcf');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadClients();
    }, [user]);

    const loadClients = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Buscar salão do usuário
            const { data: salons } = await supabase
                .from('salons')
                .select('id')
                .eq('owner_id', user.id)
                .limit(1);

            if (!salons || salons.length === 0) {
                toast.error("Salão não encontrado");
                return;
            }

            const salonId = salons[0].id;

            // Buscar clientes do salão
            const { data: clientsData, error } = await supabase
                .from('clients')
                .select('*')
                .eq('salon_id', salonId)
                .order('name');

            if (error) throw error;

            setClients(clientsData || []);

            // Selecionar todos por padrão
            const allIds = new Set(clientsData?.map(c => c.id) || []);
            setSelectedClients(allIds);

            toast.success(`${clientsData?.length || 0} clientes carregados`);
        } catch (error: any) {
            console.error('Erro ao carregar clientes:', error);
            toast.error("Erro ao carregar clientes");
        } finally {
            setLoading(false);
        }
    };

    const toggleClient = (clientId: string) => {
        const newSelected = new Set(selectedClients);
        if (newSelected.has(clientId)) {
            newSelected.delete(clientId);
        } else {
            newSelected.add(clientId);
        }
        setSelectedClients(newSelected);
    };

    const toggleAll = () => {
        if (selectedClients.size === clients.length) {
            setSelectedClients(new Set());
        } else {
            setSelectedClients(new Set(clients.map(c => c.id)));
        }
    };

    const normalizePhone = (phone: string): string => {
        // Remove caracteres não numéricos
        let cleaned = phone.replace(/[^\d]/g, '');

        // Adicionar código do país se necessário
        if (cleaned.length === 11) {
            cleaned = '55' + cleaned;
        } else if (cleaned.length === 10) {
            cleaned = '55' + cleaned;
        }

        return cleaned;
    };

    const generateVCF = (selectedClientsData: Client[]): string => {
        let vcfContent = '';

        for (const client of selectedClientsData) {
            const phone = normalizePhone(client.phone);
            const birthDate = client.preferences?.birth_date || client.birth_date;

            vcfContent += 'BEGIN:VCARD\n';
            vcfContent += 'VERSION:3.0\n';
            vcfContent += `FN:${client.name}\n`;
            vcfContent += `N:${client.name};;;;\n`;
            vcfContent += `TEL;TYPE=CELL:+${phone}\n`;

            if (client.email) {
                vcfContent += `EMAIL:${client.email}\n`;
            }

            if (birthDate) {
                // Formato: BDAY:YYYY-MM-DD
                vcfContent += `BDAY:${birthDate}\n`;
            }

            vcfContent += `NOTE:Cliente exportado do SysHair em ${new Date().toLocaleDateString('pt-BR')}\n`;
            vcfContent += 'END:VCARD\n';
        }

        return vcfContent;
    };

    const generateCSV = (selectedClientsData: Client[]): string => {
        // Cabeçalho
        let csvContent = 'Nome,Telefone,Email,Data de Nascimento,Data de Cadastro\n';

        for (const client of selectedClientsData) {
            const phone = client.phone;
            const email = client.email || '';
            const birthDate = client.preferences?.birth_date || client.birth_date || '';
            const createdAt = new Date(client.created_at).toLocaleDateString('pt-BR');

            // Escapar vírgulas e aspas
            const escapeCsv = (str: string) => {
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            csvContent += `${escapeCsv(client.name)},${escapeCsv(phone)},${escapeCsv(email)},${escapeCsv(birthDate)},${escapeCsv(createdAt)}\n`;
        }

        return csvContent;
    };

    const handleExport = async () => {
        if (selectedClients.size === 0) {
            toast.error("Selecione pelo menos um cliente");
            return;
        }

        try {
            setExporting(true);
            setProgress(0);

            // Filtrar clientes selecionados
            const selectedClientsData = clients.filter(c => selectedClients.has(c.id));

            setProgress(30);

            let content: string;
            let filename: string;
            let mimeType: string;

            if (exportFormat === 'vcf') {
                content = generateVCF(selectedClientsData);
                filename = `clientes_${new Date().toISOString().split('T')[0]}.vcf`;
                mimeType = 'text/vcard';
            } else {
                content = generateCSV(selectedClientsData);
                filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            }

            setProgress(70);

            // Criar blob e fazer download
            const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setProgress(100);

            toast.success(`${selectedClientsData.length} clientes exportados com sucesso!`);

            // Reset progress após 2 segundos
            setTimeout(() => {
                setProgress(0);
            }, 2000);

        } catch (error: any) {
            console.error('Erro ao exportar:', error);
            toast.error("Erro ao exportar clientes");
        } finally {
            setExporting(false);
        }
    };

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold">Exportar Clientes</h1>
                        <p className="text-muted-foreground mt-2">
                            Exporte seus clientes em formato VCF (vCard) ou CSV
                        </p>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total de Clientes</p>
                                        <p className="text-2xl font-bold">{clients.length}</p>
                                    </div>
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Selecionados</p>
                                        <p className="text-2xl font-bold">{selectedClients.size}</p>
                                    </div>
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Formato</p>
                                        <p className="text-2xl font-bold uppercase">{exportFormat}</p>
                                    </div>
                                    {exportFormat === 'vcf' ? (
                                        <FileText className="h-8 w-8 text-blue-500" />
                                    ) : (
                                        <FileSpreadsheet className="h-8 w-8 text-green-500" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Formato de Exportação */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Formato de Exportação</CardTitle>
                            <CardDescription>
                                Escolha o formato para exportar seus clientes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                                    <RadioGroupItem value="vcf" id="vcf" />
                                    <Label htmlFor="vcf" className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-blue-500" />
                                            <div>
                                                <p className="font-medium">VCF (vCard)</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Formato padrão de contatos. Pode ser importado no WhatsApp, iPhone, Android, etc.
                                                </p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                                    <RadioGroupItem value="csv" id="csv" />
                                    <Label htmlFor="csv" className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="h-5 w-5 text-green-500" />
                                            <div>
                                                <p className="font-medium">CSV (Excel)</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Planilha com dados dos clientes. Pode ser aberto no Excel, Google Sheets, etc.
                                                </p>
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Lista de Clientes */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Selecionar Clientes</CardTitle>
                                    <CardDescription>
                                        Escolha quais clientes deseja exportar
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleAll}
                                >
                                    {selectedClients.size === clients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-2">
                                        {clients.map((client) => (
                                            <div
                                                key={client.id}
                                                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                                onClick={() => toggleClient(client.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedClients.has(client.id)}
                                                    onCheckedChange={() => toggleClient(client.id)}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium">{client.name}</p>
                                                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                                                </div>
                                                {client.email && (
                                                    <p className="text-sm text-muted-foreground">{client.email}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* Botão de Exportação */}
                    <Card>
                        <CardContent className="pt-6">
                            {exporting && progress > 0 && (
                                <div className="mb-4">
                                    <Progress value={progress} className="h-2" />
                                    <p className="text-sm text-muted-foreground text-center mt-2">
                                        Exportando... {progress}%
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={handleExport}
                                disabled={exporting || selectedClients.size === 0}
                                className="w-full"
                                size="lg"
                            >
                                {exporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Exportando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        Exportar {selectedClients.size} Cliente{selectedClients.size !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-muted-foreground text-center mt-4">
                                O arquivo será baixado automaticamente no seu computador
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
