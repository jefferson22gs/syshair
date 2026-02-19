import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Upload,
    Smartphone,
    MessageCircle,
    Users,
    FileText,
    Check,
    X,
    Loader2,
    Download,
    AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedContact {
    name: string;
    phone: string;
    selected: boolean;
}

// Helper to decode QUOTED-PRINTABLE
const decodeQuotedPrintable = (str: string): string => {
    try {
        return str.replace(/=([0-9A-F]{2})/gi, (_, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    } catch {
        return str;
    }
};

// Helper to normalize phone numbers
const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it, otherwise add +55 (Brazil)
    if (!cleaned.startsWith('+')) {
        // Add Brazil code if not present
        if (cleaned.length === 11 || cleaned.length === 10) {
            cleaned = '+55' + cleaned;
        } else if (cleaned.length === 9 || cleaned.length === 8) {
            // Assume São Paulo DDD 11
            cleaned = '+5511' + cleaned;
        }
    }

    return cleaned;
};

// Parse VCF file content
const parseVCF = (content: string): ParsedContact[] => {
    const contacts: ParsedContact[] = [];
    const vcards = content.split(/BEGIN:VCARD/i).filter(v => v.trim());

    for (const vcard of vcards) {
        let name = '';
        let phone = '';

        // Parse FN (Full Name)
        const fnMatch = vcard.match(/FN(?:;[^:]*)?:(.+)/i);
        if (fnMatch) {
            let fnValue = fnMatch[1].trim();
            // Check if it's encoded
            if (fnMatch[0].includes('QUOTED-PRINTABLE')) {
                fnValue = decodeQuotedPrintable(fnValue);
            }
            // Decode UTF-8 bytes
            try {
                fnValue = decodeURIComponent(escape(fnValue));
            } catch { }
            name = fnValue;
        }

        // Parse TEL (Phone)
        const telMatches = vcard.match(/TEL[^:]*:([^\r\n]+)/gi);
        if (telMatches && telMatches.length > 0) {
            // Get the first phone number
            const telMatch = telMatches[0].match(/TEL[^:]*:([^\r\n]+)/i);
            if (telMatch) {
                phone = normalizePhone(telMatch[1].trim());
            }
        }

        if (name && phone && phone.length >= 10) {
            contacts.push({ name, phone, selected: true });
        }
    }

    // Remove duplicates by phone
    const uniqueContacts = contacts.reduce((acc, current) => {
        const exists = acc.find(c => c.phone === current.phone);
        if (!exists) {
            acc.push(current);
        }
        return acc;
    }, [] as ParsedContact[]);

    return uniqueContacts;
};

const ImportContacts = () => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [salonId, setSalonId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
    const [importResults, setImportResults] = useState<{ success: number; duplicates: number; errors: number } | null>(null);

    // Evolution API config
    const [evolutionUrl, setEvolutionUrl] = useState('');
    const [evolutionApiKey, setEvolutionApiKey] = useState('');
    const [evolutionInstance, setEvolutionInstance] = useState('');
    const [loadingEvolution, setLoadingEvolution] = useState(false);

    useEffect(() => {
        fetchSalon();
    }, [user]);

    const fetchSalon = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('salons')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (error) throw error;
            if (data) setSalonId(data.id);
        } catch (error) {
            console.error('Error fetching salon:', error);
            toast.error('Erro ao carregar salão');
        } finally {
            setLoading(false);
        }
    };

    // Handle VCF file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.vcf')) {
            toast.error('Por favor, selecione um arquivo VCF válido');
            return;
        }

        try {
            const content = await file.text();
            const contacts = parseVCF(content);

            if (contacts.length === 0) {
                toast.error('Nenhum contato válido encontrado no arquivo');
                return;
            }

            setParsedContacts(contacts);
            toast.success(`${contacts.length} contatos encontrados!`);
        } catch (error) {
            console.error('Error parsing VCF:', error);
            toast.error('Erro ao processar arquivo VCF');
        }
    };

    // Handle Contact Picker API (browser)
    const handleContactPicker = async () => {
        // Check if Contact Picker API is supported
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast.error('Seu navegador não suporta a importação de contatos. Tente no Chrome para Android.');
            return;
        }

        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };

            // @ts-ignore - Contact Picker API types
            const contacts = await navigator.contacts.select(props, opts);

            const parsedContacts: ParsedContact[] = contacts
                .filter((c: any) => c.tel && c.tel.length > 0)
                .map((c: any) => ({
                    name: c.name?.[0] || 'Sem nome',
                    phone: normalizePhone(c.tel[0]),
                    selected: true
                }));

            if (parsedContacts.length === 0) {
                toast.error('Nenhum contato com número de telefone selecionado');
                return;
            }

            setParsedContacts(parsedContacts);
            toast.success(`${parsedContacts.length} contatos selecionados!`);
        } catch (error: any) {
            if (error.name === 'SecurityError') {
                toast.error('Permissão negada para acessar contatos');
            } else {
                console.error('Error accessing contacts:', error);
                toast.error('Erro ao acessar contatos do dispositivo');
            }
        }
    };

    // Handle Evolution API import
    const handleEvolutionImport = async () => {
        if (!evolutionUrl || !evolutionApiKey || !evolutionInstance) {
            toast.error('Preencha todos os campos da Evolution API');
            return;
        }

        setLoadingEvolution(true);
        try {
            // Fetch contacts from Evolution API
            const response = await fetch(`${evolutionUrl}/chat/findContacts/${evolutionInstance}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionApiKey
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Parse Evolution contacts
            const contacts: ParsedContact[] = [];

            if (Array.isArray(data)) {
                for (const contact of data) {
                    const phone = contact.id?.replace('@s.whatsapp.net', '') || contact.remoteJid?.replace('@s.whatsapp.net', '');
                    const name = contact.pushName || contact.name || contact.notify || phone;

                    if (phone && phone.length >= 10 && !phone.includes('-')) {
                        contacts.push({
                            name: name || 'Sem nome',
                            phone: normalizePhone(phone),
                            selected: true
                        });
                    }
                }
            }

            if (contacts.length === 0) {
                toast.error('Nenhum contato encontrado na Evolution API');
                return;
            }

            // Remove duplicates
            const uniqueContacts = contacts.reduce((acc, current) => {
                const exists = acc.find(c => c.phone === current.phone);
                if (!exists) acc.push(current);
                return acc;
            }, [] as ParsedContact[]);

            setParsedContacts(uniqueContacts);
            toast.success(`${uniqueContacts.length} contatos encontrados no WhatsApp!`);
        } catch (error: any) {
            console.error('Error fetching Evolution contacts:', error);
            toast.error('Erro ao buscar contatos da Evolution API. Verifique a URL e credenciais.');
        } finally {
            setLoadingEvolution(false);
        }
    };

    // Toggle contact selection
    const toggleContact = (index: number) => {
        setParsedContacts(prev => prev.map((c, i) =>
            i === index ? { ...c, selected: !c.selected } : c
        ));
    };

    // Select/Deselect all
    const toggleAll = (selected: boolean) => {
        setParsedContacts(prev => prev.map(c => ({ ...c, selected })));
    };

    // Import selected contacts to database
    const importToDatabase = async () => {
        if (!salonId) {
            toast.error('Salão não encontrado');
            return;
        }

        const selectedContacts = parsedContacts.filter(c => c.selected);
        if (selectedContacts.length === 0) {
            toast.error('Selecione pelo menos um contato para importar');
            return;
        }

        setImporting(true);
        setProgress(0);
        setImportResults(null);

        let success = 0;
        let duplicates = 0;
        let errors = 0;

        const batchSize = 50;
        const batches = Math.ceil(selectedContacts.length / batchSize);

        for (let i = 0; i < batches; i++) {
            const batch = selectedContacts.slice(i * batchSize, (i + 1) * batchSize);

            for (const contact of batch) {
                try {
                    // Check if client already exists
                    const { data: existing } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('salon_id', salonId)
                        .eq('phone', contact.phone)
                        .maybeSingle();

                    if (existing) {
                        duplicates++;
                    } else {
                        // Insert new client
                        const { error } = await supabase
                            .from('clients')
                            .insert({
                                salon_id: salonId,
                                name: contact.name,
                                phone: contact.phone,
                                notes: 'Importado automaticamente'
                            });

                        if (error) {
                            errors++;
                        } else {
                            success++;
                        }
                    }
                } catch (error) {
                    errors++;
                }
            }

            setProgress(Math.round(((i + 1) / batches) * 100));
        }

        setImporting(false);
        setImportResults({ success, duplicates, errors });

        if (success > 0) {
            toast.success(`${success} contatos importados com sucesso!`);
        }
        if (duplicates > 0) {
            toast.info(`${duplicates} contatos já existiam`);
        }
        if (errors > 0) {
            toast.error(`${errors} erros durante a importação`);
        }
    };

    // Clear parsed contacts
    const clearContacts = () => {
        setParsedContacts([]);
        setImportResults(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const selectedCount = parsedContacts.filter(c => c.selected).length;

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">
                        Importar Contatos
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Importe contatos do celular, WhatsApp ou arquivo VCF para sua lista de clientes
                    </p>
                </div>

                {/* Import Methods */}
                {parsedContacts.length === 0 ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* VCF File Upload */}
                        <Card className="glass-card hover:border-primary/50 transition-colors cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText size={24} className="text-primary" />
                                    Arquivo VCF
                                </CardTitle>
                                <CardDescription>
                                    Importe contatos de um arquivo .vcf exportado de outro dispositivo
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".vcf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Upload size={18} className="mr-2" />
                                    Selecionar Arquivo
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Contact Picker (Mobile) */}
                        <Card className="glass-card hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone size={24} className="text-green-500" />
                                    Contatos do Celular
                                </CardTitle>
                                <CardDescription>
                                    Importe diretamente dos contatos salvos no seu dispositivo (Android)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full" onClick={handleContactPicker}>
                                    <Users size={18} className="mr-2" />
                                    Selecionar Contatos
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Evolution API */}
                        <Card className="glass-card hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageCircle size={24} className="text-[#25D366]" />
                                    WhatsApp (Evolution)
                                </CardTitle>
                                <CardDescription>
                                    Importe contatos diretamente do WhatsApp via Evolution API
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="URL da API (ex: https://api.exemplo.com)"
                                        value={evolutionUrl}
                                        onChange={(e) => setEvolutionUrl(e.target.value)}
                                    />
                                    <Input
                                        placeholder="API Key"
                                        type="password"
                                        value={evolutionApiKey}
                                        onChange={(e) => setEvolutionApiKey(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Nome da Instância"
                                        value={evolutionInstance}
                                        onChange={(e) => setEvolutionInstance(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleEvolutionImport}
                                    disabled={loadingEvolution}
                                >
                                    {loadingEvolution ? (
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                    ) : (
                                        <Download size={18} className="mr-2" />
                                    )}
                                    Buscar Contatos
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Contact List Header */}
                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users size={24} className="text-primary" />
                                            Contatos Encontrados
                                        </CardTitle>
                                        <CardDescription>
                                            {parsedContacts.length} contatos • {selectedCount} selecionados
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                                            Selecionar Todos
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                                            Desmarcar Todos
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={clearContacts}>
                                            <X size={18} className="mr-1" />
                                            Limpar
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-1">
                                        {parsedContacts.map((contact, index) => (
                                            <div
                                                key={index}
                                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-secondary/50 ${contact.selected ? 'bg-primary/10' : ''
                                                    }`}
                                                onClick={() => toggleContact(index)}
                                            >
                                                <Checkbox checked={contact.selected} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{contact.name}</p>
                                                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Import Progress & Results */}
                        {importing && (
                            <Card className="glass-card">
                                <CardContent className="py-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 size={20} className="animate-spin text-primary" />
                                            <span>Importando contatos...</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-center text-sm text-muted-foreground">{progress}%</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {importResults && (
                            <Card className="glass-card">
                                <CardContent className="py-6">
                                    <div className="flex items-center justify-center gap-8">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mx-auto mb-2">
                                                <Check size={24} className="text-green-500" />
                                            </div>
                                            <p className="text-2xl font-bold">{importResults.success}</p>
                                            <p className="text-sm text-muted-foreground">Importados</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mx-auto mb-2">
                                                <AlertCircle size={24} className="text-yellow-500" />
                                            </div>
                                            <p className="text-2xl font-bold">{importResults.duplicates}</p>
                                            <p className="text-sm text-muted-foreground">Duplicados</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mx-auto mb-2">
                                                <X size={24} className="text-red-500" />
                                            </div>
                                            <p className="text-2xl font-bold">{importResults.errors}</p>
                                            <p className="text-sm text-muted-foreground">Erros</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Import Button */}
                        {!importing && (
                            <div className="flex justify-center">
                                <Button
                                    variant="gold"
                                    size="lg"
                                    onClick={importToDatabase}
                                    disabled={selectedCount === 0}
                                >
                                    <Users size={20} className="mr-2" />
                                    Importar {selectedCount} Contatos
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default ImportContacts;
