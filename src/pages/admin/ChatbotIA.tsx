import { useState, useEffect } from "react";
import {
    Bot,
    Settings,
    MessageSquare,
    History,
    Play,
    Save,
    RefreshCw,
    Send,
    Sparkles,
    Brain,
    Zap,
    Clock,
    ToggleLeft,
    ToggleRight,
    ChevronDown,
    Trash2,
    Plus,
    Search,
    Filter,
    Download,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Tipos
interface ChatbotSettings {
    id?: string;
    enabled: boolean;
    ai_provider: 'openai' | 'gemini' | 'grok' | 'perplexity' | 'groq';
    ai_model: string;
    api_key: string;
    bot_name: string;
    welcome_message: string;
    system_prompt: string;
    custom_instructions: string;
    temperature: number;
    max_tokens: number;
    response_delay_ms: number;
    active_hours_start: string;
    active_hours_end: string;
    active_days: number[];
    out_of_hours_message: string;
    fallback_message: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ConversationHistory {
    id: string;
    client_phone: string;
    client_name: string;
    direction: 'incoming' | 'outgoing';
    content: string;
    ai_response: boolean;
    created_at: string;
}

interface KnowledgeItem {
    id: string;
    category: string;
    question: string;
    answer: string;
    keywords: string[];
    enabled: boolean;
}

// Provedores de IA disponíveis
const AI_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-pro'] },
    { id: 'grok', name: 'xAI Grok', models: ['grok-2', 'grok-2-mini'] },
    { id: 'perplexity', name: 'Perplexity', models: ['llama-3.1-sonar-large', 'llama-3.1-sonar-small'] },
    { id: 'groq', name: 'Groq (Ultra Rápido)', models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'] },
];

const DAYS_OF_WEEK = [
    { id: 0, name: 'Dom', fullName: 'Domingo' },
    { id: 1, name: 'Seg', fullName: 'Segunda' },
    { id: 2, name: 'Ter', fullName: 'Terça' },
    { id: 3, name: 'Qua', fullName: 'Quarta' },
    { id: 4, name: 'Qui', fullName: 'Quinta' },
    { id: 5, name: 'Sex', fullName: 'Sexta' },
    { id: 6, name: 'Sáb', fullName: 'Sábado' },
];

const DEFAULT_SETTINGS: ChatbotSettings = {
    enabled: false,
    ai_provider: 'openai',
    ai_model: 'gpt-4o-mini',
    api_key: '',
    bot_name: 'Assistente',
    welcome_message: 'Olá! Sou o assistente virtual do salão. Como posso ajudar?',
    system_prompt: `Você é um assistente virtual profissional de um salão de beleza.

Suas responsabilidades:
- Responder dúvidas sobre serviços, preços e horários
- Ajudar clientes a agendar atendimentos
- Fornecer informações sobre o salão
- Ser educado, prestativo e profissional

Sempre responda em português brasileiro de forma amigável e objetiva.`,
    custom_instructions: '',
    temperature: 0.7,
    max_tokens: 500,
    response_delay_ms: 1000,
    active_hours_start: '08:00',
    active_hours_end: '22:00',
    active_days: [1, 2, 3, 4, 5, 6],
    out_of_hours_message: 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!',
    fallback_message: 'Desculpe, não entendi sua mensagem. Pode reformular?',
};

const ChatbotIA = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('settings');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [salonId, setSalonId] = useState<string | null>(null);

    // Estados das configurações
    const [settings, setSettings] = useState<ChatbotSettings>(DEFAULT_SETTINGS);

    // Estados do teste
    const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
    const [testInput, setTestInput] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    // Estados do histórico
    const [conversations, setConversations] = useState<ConversationHistory[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('today');

    // Estados da base de conhecimento
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
    const [newKnowledge, setNewKnowledge] = useState({ category: 'general', question: '', answer: '', keywords: '' });

    // Carregar dados iniciais
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Buscar salon_id do usuário
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: salon } = await supabase
                .from('salons')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!salon) return;
            setSalonId(salon.id);

            // Buscar configurações do chatbot
            const { data: chatbotSettings } = await supabase
                .from('chatbot_settings')
                .select('*')
                .eq('salon_id', salon.id)
                .single();

            if (chatbotSettings) {
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...chatbotSettings,
                    api_key: chatbotSettings.api_key || '',
                });
            }

            // Buscar base de conhecimento
            const { data: knowledge } = await supabase
                .from('chatbot_knowledge_base')
                .select('*')
                .eq('salon_id', salon.id)
                .order('priority', { ascending: false });

            if (knowledge) {
                setKnowledgeBase(knowledge as KnowledgeItem[]);
            }

            // Buscar histórico de conversas
            await loadConversations(salon.id);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadConversations = async (salonIdParam?: string) => {
        const id = salonIdParam || salonId;
        if (!id) return;

        let query = supabase
            .from('chatbot_conversations')
            .select('*')
            .eq('salon_id', id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (searchTerm) {
            query = query.or(`content.ilike.%${searchTerm}%,client_phone.ilike.%${searchTerm}%`);
        }

        const { data } = await query;
        if (data) {
            setConversations(data as ConversationHistory[]);
        }
    };

    const handleSaveSettings = async () => {
        if (!salonId) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('chatbot_settings')
                .upsert({
                    salon_id: salonId,
                    ...settings,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'salon_id' });

            if (error) throw error;

            toast({
                title: "Configurações salvas!",
                description: "As configurações do chatbot foram atualizadas.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestMessage = async () => {
        if (!testInput.trim() || !settings.api_key) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: testInput,
            timestamp: new Date(),
        };

        setTestMessages(prev => [...prev, userMessage]);
        setTestInput('');
        setIsTesting(true);

        try {
            // Simular resposta da IA (em produção, chamar a API real)
            await new Promise(resolve => setTimeout(resolve, 1500));

            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `[Simulação] Resposta da IA usando ${settings.ai_provider}/${settings.ai_model}: "${testInput}"`,
                timestamp: new Date(),
            };

            setTestMessages(prev => [...prev, aiResponse]);
        } catch (error: any) {
            toast({
                title: "Erro no teste",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleAddKnowledge = async () => {
        if (!salonId || !newKnowledge.question || !newKnowledge.answer) return;

        try {
            const { data, error } = await supabase
                .from('chatbot_knowledge_base')
                .insert({
                    salon_id: salonId,
                    category: newKnowledge.category,
                    question: newKnowledge.question,
                    answer: newKnowledge.answer,
                    keywords: newKnowledge.keywords.split(',').map(k => k.trim()).filter(k => k),
                })
                .select()
                .single();

            if (error) throw error;

            setKnowledgeBase(prev => [data as KnowledgeItem, ...prev]);
            setNewKnowledge({ category: 'general', question: '', answer: '', keywords: '' });

            toast({
                title: "Conhecimento adicionado!",
                description: "A base de conhecimento foi atualizada.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao adicionar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleDeleteKnowledge = async (id: string) => {
        try {
            await supabase.from('chatbot_knowledge_base').delete().eq('id', id);
            setKnowledgeBase(prev => prev.filter(k => k.id !== id));
            toast({ title: "Removido!", description: "Item removido da base de conhecimento." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const toggleDay = (dayId: number) => {
        setSettings(prev => ({
            ...prev,
            active_days: prev.active_days.includes(dayId)
                ? prev.active_days.filter(d => d !== dayId)
                : [...prev.active_days, dayId].sort()
        }));
    };

    const getAvailableModels = () => {
        const provider = AI_PROVIDERS.find(p => p.id === settings.ai_provider);
        return provider?.models || [];
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Bot className="w-8 h-8 text-primary" />
                            Chatbot IA
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Configure a inteligência artificial para atender seus clientes automaticamente
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            {settings.enabled ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle size={12} className="mr-1" />
                                    Ativo
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    <XCircle size={12} className="mr-1" />
                                    Inativo
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings size={16} />
                            <span className="hidden sm:inline">Configurações</span>
                        </TabsTrigger>
                        <TabsTrigger value="training" className="flex items-center gap-2">
                            <Brain size={16} />
                            <span className="hidden sm:inline">Treinamento</span>
                        </TabsTrigger>
                        <TabsTrigger value="test" className="flex items-center gap-2">
                            <Play size={16} />
                            <span className="hidden sm:inline">Testar</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History size={16} />
                            <span className="hidden sm:inline">Histórico</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab: Configurações */}
                    <TabsContent value="settings" className="space-y-6">
                        {/* Ativar/Desativar */}
                        <Card className="border-primary/20">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Ativar Chatbot IA</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Quando ativo, a IA responderá automaticamente as mensagens dos clientes
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.enabled}
                                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Provedor e Modelo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Provedor de IA
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Provedor</Label>
                                        <Select
                                            value={settings.ai_provider}
                                            onValueChange={(value: any) => setSettings(prev => ({
                                                ...prev,
                                                ai_provider: value,
                                                ai_model: AI_PROVIDERS.find(p => p.id === value)?.models[0] || ''
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AI_PROVIDERS.map(provider => (
                                                    <SelectItem key={provider.id} value={provider.id}>
                                                        {provider.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Modelo</Label>
                                        <Select
                                            value={settings.ai_model}
                                            onValueChange={(value) => setSettings(prev => ({ ...prev, ai_model: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getAvailableModels().map(model => (
                                                    <SelectItem key={model} value={model}>
                                                        {model}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <Input
                                            type="password"
                                            placeholder="sk-..."
                                            value={settings.api_key}
                                            onChange={(e) => setSettings(prev => ({ ...prev, api_key: e.target.value }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Sua chave de API do provedor selecionado
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Personalização */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                        Personalização
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nome do Bot</Label>
                                        <Input
                                            placeholder="Ex: Sofia, Assistente..."
                                            value={settings.bot_name}
                                            onChange={(e) => setSettings(prev => ({ ...prev, bot_name: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mensagem de Boas-vindas</Label>
                                        <Textarea
                                            placeholder="Mensagem enviada ao iniciar conversa..."
                                            value={settings.welcome_message}
                                            onChange={(e) => setSettings(prev => ({ ...prev, welcome_message: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mensagem de Fallback</Label>
                                        <Input
                                            placeholder="Quando a IA não entender..."
                                            value={settings.fallback_message}
                                            onChange={(e) => setSettings(prev => ({ ...prev, fallback_message: e.target.value }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Configurações Avançadas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-primary" />
                                        Configurações Avançadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <Label>Temperatura: {settings.temperature}</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {settings.temperature < 0.5 ? 'Mais preciso' : settings.temperature > 1 ? 'Mais criativo' : 'Balanceado'}
                                            </span>
                                        </div>
                                        <Slider
                                            value={[settings.temperature]}
                                            onValueChange={(v) => setSettings(prev => ({ ...prev, temperature: v[0] }))}
                                            min={0}
                                            max={2}
                                            step={0.1}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Máximo de Tokens</Label>
                                        <Input
                                            type="number"
                                            value={settings.max_tokens}
                                            onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 500 }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Limite de tokens por resposta (afeta custo e tamanho)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Delay de Resposta (ms)</Label>
                                        <Input
                                            type="number"
                                            value={settings.response_delay_ms}
                                            onChange={(e) => setSettings(prev => ({ ...prev, response_delay_ms: parseInt(e.target.value) || 1000 }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Tempo de espera antes de enviar resposta (parecer mais humano)
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Horário de Funcionamento */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-primary" />
                                        Horário de Funcionamento
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Início</Label>
                                            <Input
                                                type="time"
                                                value={settings.active_hours_start}
                                                onChange={(e) => setSettings(prev => ({ ...prev, active_hours_start: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Fim</Label>
                                            <Input
                                                type="time"
                                                value={settings.active_hours_end}
                                                onChange={(e) => setSettings(prev => ({ ...prev, active_hours_end: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Dias Ativos</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(day => (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleDay(day.id)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                        settings.active_days.includes(day.id)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                                    )}
                                                >
                                                    {day.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mensagem Fora do Horário</Label>
                                        <Textarea
                                            placeholder="Mensagem quando o bot está inativo..."
                                            value={settings.out_of_hours_message}
                                            onChange={(e) => setSettings(prev => ({ ...prev, out_of_hours_message: e.target.value }))}
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Botão Salvar */}
                        <div className="flex justify-end">
                            <Button
                                variant="gold"
                                size="lg"
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Salvar Configurações
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Tab: Treinamento */}
                    <TabsContent value="training" className="space-y-6">
                        {/* Prompt do Sistema */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-primary" />
                                    Prompt do Sistema
                                </CardTitle>
                                <CardDescription>
                                    Defina a personalidade e instruções gerais da IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Defina como a IA deve se comportar..."
                                    value={settings.system_prompt}
                                    onChange={(e) => setSettings(prev => ({ ...prev, system_prompt: e.target.value }))}
                                    rows={8}
                                    className="font-mono text-sm"
                                />

                                <div className="space-y-2">
                                    <Label>Instruções Personalizadas (adicional)</Label>
                                    <Textarea
                                        placeholder="Informações específicas do seu salão..."
                                        value={settings.custom_instructions}
                                        onChange={(e) => setSettings(prev => ({ ...prev, custom_instructions: e.target.value }))}
                                        rows={4}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Adicione informações sobre serviços, preços, horários, etc.
                                    </p>
                                </div>

                                <Button onClick={handleSaveSettings} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Salvar Prompt
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Base de Conhecimento */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Base de Conhecimento
                                </CardTitle>
                                <CardDescription>
                                    Adicione perguntas e respostas frequentes para treinar a IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Formulário para adicionar */}
                                <div className="p-4 rounded-lg bg-secondary/30 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Categoria</Label>
                                            <Select
                                                value={newKnowledge.category}
                                                onValueChange={(v) => setNewKnowledge(prev => ({ ...prev, category: v }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">Geral</SelectItem>
                                                    <SelectItem value="services">Serviços</SelectItem>
                                                    <SelectItem value="prices">Preços</SelectItem>
                                                    <SelectItem value="schedule">Horários</SelectItem>
                                                    <SelectItem value="location">Localização</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Palavras-chave (separadas por vírgula)</Label>
                                            <Input
                                                placeholder="corte, cabelo, preço..."
                                                value={newKnowledge.keywords}
                                                onChange={(e) => setNewKnowledge(prev => ({ ...prev, keywords: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pergunta</Label>
                                        <Input
                                            placeholder="Ex: Qual o preço do corte masculino?"
                                            value={newKnowledge.question}
                                            onChange={(e) => setNewKnowledge(prev => ({ ...prev, question: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Resposta</Label>
                                        <Textarea
                                            placeholder="Ex: O corte masculino custa R$ 50,00 e inclui..."
                                            value={newKnowledge.answer}
                                            onChange={(e) => setNewKnowledge(prev => ({ ...prev, answer: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>
                                    <Button onClick={handleAddKnowledge}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar ao Conhecimento
                                    </Button>
                                </div>

                                {/* Lista de conhecimentos */}
                                <div className="space-y-3">
                                    {knowledgeBase.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>Nenhum conhecimento adicionado ainda</p>
                                        </div>
                                    ) : (
                                        knowledgeBase.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-4 rounded-lg bg-card border flex items-start justify-between gap-4"
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">{item.category}</Badge>
                                                        {item.keywords?.map((k, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">
                                                                {k}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <p className="font-medium">{item.question}</p>
                                                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteKnowledge(item.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: Testar */}
                    <TabsContent value="test" className="space-y-6">
                        <Card className="h-[600px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Play className="w-5 h-5 text-primary" />
                                    Testar Chatbot
                                </CardTitle>
                                <CardDescription>
                                    Simule uma conversa para testar as respostas da IA
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                {/* Área de mensagens */}
                                <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-lg bg-secondary/20 mb-4">
                                    {testMessages.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>Envie uma mensagem para testar o chatbot</p>
                                        </div>
                                    ) : (
                                        testMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex",
                                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "max-w-[80%] p-3 rounded-2xl",
                                                        msg.role === 'user'
                                                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                            : 'bg-card border rounded-bl-sm'
                                                    )}
                                                >
                                                    <p className="text-sm">{msg.content}</p>
                                                    <p className="text-xs opacity-70 mt-1">
                                                        {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isTesting && (
                                        <div className="flex justify-start">
                                            <div className="bg-card border p-3 rounded-2xl rounded-bl-sm">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input de mensagem */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Digite uma mensagem para testar..."
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleTestMessage()}
                                        disabled={isTesting || !settings.api_key}
                                    />
                                    <Button
                                        onClick={handleTestMessage}
                                        disabled={isTesting || !testInput.trim() || !settings.api_key}
                                    >
                                        <Send size={16} />
                                    </Button>
                                </div>

                                {!settings.api_key && (
                                    <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        Configure sua API Key nas configurações para testar
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: Histórico */}
                    <TabsContent value="history" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <History className="w-5 h-5 text-primary" />
                                            Histórico de Conversas
                                        </CardTitle>
                                        <CardDescription>
                                            Todas as conversas processadas pelo chatbot
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar..."
                                                className="pl-9 w-64"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <Button variant="outline" size="icon" onClick={() => loadConversations()}>
                                            <RefreshCw size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {conversations.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Nenhuma conversa registrada ainda</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {conversations.map((conv) => (
                                            <div
                                                key={conv.id}
                                                className={cn(
                                                    "p-3 rounded-lg flex items-start gap-3",
                                                    conv.direction === 'incoming' ? 'bg-secondary/30' : 'bg-primary/10'
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                                                    conv.direction === 'incoming' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
                                                )}>
                                                    {conv.direction === 'incoming' ? '👤' : '🤖'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">
                                                            {conv.direction === 'incoming' ? conv.client_phone : settings.bot_name}
                                                        </span>
                                                        {conv.ai_response && (
                                                            <Badge variant="secondary" className="text-xs">IA</Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(conv.created_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">{conv.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
};

export default ChatbotIA;
