import { useState, useEffect, useRef } from "react";
import {
    Calendar,
    Clock,
    Image,
    Video,
    Type,
    Plus,
    Trash2,
    Edit,
    Play,
    Pause,
    RefreshCw,
    Upload,
    X,
    Check,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    CalendarDays,
    Repeat,
    Send,
    Eye,
    Sparkles
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
import { Switch } from "@/components/ui/switch";
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
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
interface ScheduledPost {
    id: string;
    content_type: 'text' | 'image' | 'video';
    text_content: string;
    media_url: string;
    media_filename: string;
    scheduled_at: string;
    recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly';
    recurrence_days: number[];
    recurrence_end_date: string | null;
    status: 'scheduled' | 'processing' | 'posted' | 'failed' | 'cancelled';
    posted_at: string | null;
    error_message: string | null;
    created_at: string;
}

interface WhatsAppInstance {
    id: string;
    instance_name: string;
    status: 'disconnected' | 'connecting' | 'connected' | 'qrcode';
    phone_number: string;
    qrcode: string | null;
}

const DAYS_OF_WEEK = [
    { id: 0, name: 'Dom', fullName: 'Domingo' },
    { id: 1, name: 'Seg', fullName: 'Segunda' },
    { id: 2, name: 'Ter', fullName: 'Terça' },
    { id: 3, name: 'Qua', fullName: 'Quarta' },
    { id: 4, name: 'Qui', fullName: 'Quinta' },
    { id: 5, name: 'Sex', fullName: 'Sexta' },
    { id: 6, name: 'Sáb', fullName: 'Sábado' },
];

const StatusScheduler = () => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [salonId, setSalonId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('calendar');

    // Estados dos posts
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentWeek, setCurrentWeek] = useState(new Date());

    // Estados da instância WhatsApp
    const [instance, setInstance] = useState<WhatsAppInstance | null>(null);

    // Estados do modal de criação
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatingCaption, setGeneratingCaption] = useState(false);
    const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

    // Estados do formulário
    const [formData, setFormData] = useState({
        content_type: 'image' as 'text' | 'image' | 'video',
        text_content: '',
        media_file: null as File | null,
        media_preview: '',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        scheduled_time: '09:00',
        recurrence_type: 'once' as 'once' | 'daily' | 'weekly' | 'monthly',
        recurrence_days: [] as number[],
        recurrence_end_date: '',
    });

    // Carregar dados iniciais
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: salon } = await supabase
                .from('salons')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!salon) return;
            setSalonId(salon.id);

            // Buscar instância WhatsApp
            const { data: instanceData } = await supabase
                .from('whatsapp_instances')
                .select('*')
                .eq('salon_id', salon.id)
                .single();

            if (instanceData) {
                setInstance(instanceData as WhatsAppInstance);
            }

            // Buscar posts agendados
            await loadPosts(salon.id);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadPosts = async (salonIdParam?: string) => {
        const id = salonIdParam || salonId;
        if (!id) return;

        const { data } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('salon_id', id)
            .order('scheduled_at', { ascending: true });

        if (data) {
            setPosts(data as ScheduledPost[]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            toast({
                title: "Arquivo inválido",
                description: "Selecione uma imagem ou vídeo.",
                variant: "destructive",
            });
            return;
        }

        // Criar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setFormData(prev => ({
                ...prev,
                content_type: isVideo ? 'video' : 'image',
                media_file: file,
                media_preview: e.target?.result as string,
            }));
        };
        reader.readAsDataURL(file);
    };

    const generateCaption = async () => {
        if (!formData.media_preview && !editingPost?.media_url) {
            toast({
                title: "Nenhuma imagem",
                description: "Adicione uma imagem primeiro para gerar a legenda.",
                variant: "destructive",
            });
            return;
        }

        setGeneratingCaption(true);
        try {
            // Buscar API Key ativa do banco de dados
            const { data: apiKeyData, error: apiKeyError } = await supabase
                .from("ai_provider_keys")
                .select("*")
                .eq("provider", "gemini")
                .eq("is_active", true)
                .maybeSingle();

            if (apiKeyError || !apiKeyData) {
                throw new Error("Nenhuma chave de API Gemini ativa encontrada. Configure no Super Admin.");
            }

            // Obter base64 da imagem
            let imageBase64 = formData.media_preview;

            // Se for URL (editando post), baixar e converter para base64
            if (!imageBase64 && editingPost?.media_url) {
                const response = await fetch(editingPost.media_url);
                const blob = await response.blob();
                imageBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }

            if (!imageBase64) {
                throw new Error("Não foi possível processar a imagem");
            }

            // Remover header do base64 (data:image/jpeg;base64,)
            const base64Data = imageBase64.includes(',')
                ? imageBase64.split(',')[1]
                : imageBase64;

            // Prompt especializado para salão de beleza
            const prompt = `
                Atue como um Criador de Conteúdo para Redes Sociais de um Salão de Beleza/Barbearia.

                Sua tarefa: Analisar a imagem anexada e criar uma legenda PERFEITA
                para postar no Status do WhatsApp/Stories.

                1. Identifique o que acontece na imagem (Cenário, Texto, Pessoas, Emoção).
                2. Crie uma frase curta, impactante e criativa sobre ESSE CONTEÚDO.

                Regras:
                - SEJA NATURAL. Não pareça um robô.
                - Use 2-4 Emojis que combinem com a foto (💇‍♀️✨💅💈).
                - Se a imagem tiver texto, complemente a mensagem do texto.
                - Se for transformação/antes-depois, destaque o resultado.
                - MÁXIMO 2 linhas.
                - Tom inspirador e positivo.

                Retorne APENAS o texto da legenda, sem aspas ou explicações.
            `;

            // Chamar Gemini API com a chave do banco
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeyData.api_key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: base64Data
                                    }
                                }
                            ]
                        }]
                    })
                }
            );

            const data = await response.json();
            console.log("Gemini response:", data);

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const caption = data.candidates[0].content.parts[0].text.trim();
                setFormData(prev => ({ ...prev, text_content: caption }));
                toast({
                    title: "✨ Legenda gerada!",
                    description: "A IA criou uma legenda para sua imagem.",
                });
            } else if (data.error) {
                throw new Error(data.error.message || "Erro na API do Gemini");
            } else {
                throw new Error("Não foi possível gerar a legenda");
            }
        } catch (error: any) {
            console.error("Error generating caption:", error);
            toast({
                title: "Erro ao gerar legenda",
                description: error.message || "Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setGeneratingCaption(false);
        }
    };

    const handleSubmit = async () => {
        if (!salonId) return;

        // Validações
        if (formData.content_type !== 'text' && !formData.media_file && !editingPost?.media_url) {
            toast({
                title: "Mídia obrigatória",
                description: "Selecione uma imagem ou vídeo.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            let mediaUrl = editingPost?.media_url || '';

            // Upload do arquivo se houver
            if (formData.media_file) {
                const fileName = `${salonId}/${Date.now()}_${formData.media_file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('status-media')
                    .upload(fileName, formData.media_file);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('status-media')
                    .getPublicUrl(fileName);

                mediaUrl = urlData.publicUrl;
            }

            // Montar data/hora agendada
            const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);

            const postData = {
                salon_id: salonId,
                content_type: formData.content_type,
                text_content: formData.text_content,
                media_url: mediaUrl,
                media_filename: formData.media_file?.name || editingPost?.media_filename,
                scheduled_at: scheduledAt.toISOString(),
                recurrence_type: formData.recurrence_type,
                recurrence_days: formData.recurrence_days,
                recurrence_end_date: formData.recurrence_end_date || null,
                status: 'scheduled' as const,
            };

            if (editingPost) {
                // Atualizar
                const { error } = await supabase
                    .from('scheduled_posts')
                    .update(postData)
                    .eq('id', editingPost.id);

                if (error) throw error;

                toast({
                    title: "Post atualizado!",
                    description: "O agendamento foi atualizado com sucesso.",
                });
            } else {
                // Criar novo
                const { error } = await supabase
                    .from('scheduled_posts')
                    .insert(postData);

                if (error) throw error;

                toast({
                    title: "Post agendado!",
                    description: `Será publicado em ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
                });
            }

            // Recarregar posts e fechar modal
            await loadPosts();
            handleCloseModal();

        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (postId: string) => {
        try {
            const { error } = await supabase
                .from('scheduled_posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: "Post removido!", description: "O agendamento foi cancelado." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleEdit = (post: ScheduledPost) => {
        const scheduledDate = new Date(post.scheduled_at);
        setEditingPost(post);
        setFormData({
            content_type: post.content_type,
            text_content: post.text_content || '',
            media_file: null,
            media_preview: post.media_url || '',
            scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
            scheduled_time: format(scheduledDate, 'HH:mm'),
            recurrence_type: post.recurrence_type,
            recurrence_days: post.recurrence_days || [],
            recurrence_end_date: post.recurrence_end_date || '',
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPost(null);
        setFormData({
            content_type: 'image',
            text_content: '',
            media_file: null,
            media_preview: '',
            scheduled_date: format(new Date(), 'yyyy-MM-dd'),
            scheduled_time: '09:00',
            recurrence_type: 'once',
            recurrence_days: [],
            recurrence_end_date: '',
        });
    };

    const toggleRecurrenceDay = (dayId: number) => {
        setFormData(prev => ({
            ...prev,
            recurrence_days: prev.recurrence_days.includes(dayId)
                ? prev.recurrence_days.filter(d => d !== dayId)
                : [...prev.recurrence_days, dayId].sort()
        }));
    };

    // Obter dias da semana atual
    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentWeek, { weekStartsOn: 0 }),
        end: endOfWeek(currentWeek, { weekStartsOn: 0 }),
    });

    // Filtrar posts por dia
    const getPostsForDay = (date: Date) => {
        return posts.filter(post => isSameDay(parseISO(post.scheduled_at), date));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
                return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendado</Badge>;
            case 'processing':
                return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Processando</Badge>;
            case 'posted':
                return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Publicado</Badge>;
            case 'failed':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Falhou</Badge>;
            case 'cancelled':
                return <Badge variant="secondary">Cancelado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <CalendarDays className="w-8 h-8 text-primary" />
                            Agendador de Status
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Agende fotos e vídeos para publicar automaticamente no Status do WhatsApp
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {instance?.status === 'connected' ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
                                <CheckCircle size={14} className="mr-2" />
                                WhatsApp Conectado
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="px-4 py-2">
                                <XCircle size={14} className="mr-2" />
                                WhatsApp Desconectado
                            </Badge>
                        )}

                        <Button variant="gold" onClick={() => setIsModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Agendar Post
                        </Button>
                    </div>
                </div>

                {/* Alerta se WhatsApp não conectado */}
                {instance?.status !== 'connected' && (
                    <Card className="border-orange-500/50 bg-orange-500/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <AlertCircle className="w-6 h-6 text-orange-500" />
                            <div className="flex-1">
                                <p className="font-medium text-orange-500">WhatsApp não conectado</p>
                                <p className="text-sm text-muted-foreground">
                                    Conecte seu WhatsApp para que os posts sejam publicados automaticamente.
                                </p>
                            </div>
                            <Button variant="outline">Conectar WhatsApp</Button>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="calendar" className="flex items-center gap-2">
                            <Calendar size={16} />
                            Calendário
                        </TabsTrigger>
                        <TabsTrigger value="list" className="flex items-center gap-2">
                            <CalendarDays size={16} />
                            Lista
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab: Calendário */}
                    <TabsContent value="calendar" className="mt-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>
                                        {format(currentWeek, "MMMM 'de' yyyy", { locale: ptBR })}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                                        >
                                            ← Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentWeek(new Date())}
                                        >
                                            Hoje
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                                        >
                                            Próxima →
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-7 gap-2">
                                    {/* Headers dos dias */}
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day.id} className="text-center py-2 font-medium text-muted-foreground">
                                            {day.name}
                                        </div>
                                    ))}

                                    {/* Células dos dias */}
                                    {weekDays.map(day => {
                                        const dayPosts = getPostsForDay(day);
                                        const isToday = isSameDay(day, new Date());

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={cn(
                                                    "min-h-[120px] p-2 rounded-lg border transition-colors cursor-pointer",
                                                    isToday ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                                                    isSameDay(day, selectedDate) && "ring-2 ring-primary"
                                                )}
                                                onClick={() => setSelectedDate(day)}
                                            >
                                                <div className={cn(
                                                    "text-sm font-medium mb-2",
                                                    isToday && "text-primary"
                                                )}>
                                                    {format(day, 'd')}
                                                </div>

                                                <div className="space-y-1">
                                                    {dayPosts.slice(0, 3).map(post => (
                                                        <div
                                                            key={post.id}
                                                            className={cn(
                                                                "text-xs p-1.5 rounded flex items-center gap-1 truncate",
                                                                post.status === 'posted' && "bg-green-500/20 text-green-400",
                                                                post.status === 'scheduled' && "bg-blue-500/20 text-blue-400",
                                                                post.status === 'failed' && "bg-red-500/20 text-red-400"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(post);
                                                            }}
                                                        >
                                                            {post.content_type === 'image' && <Image size={10} />}
                                                            {post.content_type === 'video' && <Video size={10} />}
                                                            {post.content_type === 'text' && <Type size={10} />}
                                                            <span className="truncate">
                                                                {format(parseISO(post.scheduled_at), 'HH:mm')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {dayPosts.length > 3 && (
                                                        <div className="text-xs text-muted-foreground text-center">
                                                            +{dayPosts.length - 3} mais
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab: Lista */}
                    <TabsContent value="list" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Todos os Posts Agendados</CardTitle>
                                <CardDescription>
                                    {posts.filter(p => p.status === 'scheduled').length} posts aguardando publicação
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {posts.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Nenhum post agendado</p>
                                        <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Agendar primeiro post
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {posts.map(post => (
                                            <div
                                                key={post.id}
                                                className="flex items-center gap-4 p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors"
                                            >
                                                {/* Preview da mídia */}
                                                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                                                    {post.content_type === 'image' && post.media_url ? (
                                                        <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                                                    ) : post.content_type === 'video' ? (
                                                        <Video className="w-6 h-6 text-muted-foreground" />
                                                    ) : (
                                                        <Type className="w-6 h-6 text-muted-foreground" />
                                                    )}
                                                </div>

                                                {/* Informações */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {getStatusBadge(post.status)}
                                                        {post.recurrence_type !== 'once' && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <Repeat size={10} className="mr-1" />
                                                                {post.recurrence_type === 'daily' && 'Diário'}
                                                                {post.recurrence_type === 'weekly' && 'Semanal'}
                                                                {post.recurrence_type === 'monthly' && 'Mensal'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium truncate">
                                                        {post.text_content || post.media_filename || 'Sem texto'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {format(parseISO(post.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>

                                                {/* Ações */}
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(post)}
                                                        disabled={post.status === 'posted'}
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        onClick={() => handleDelete(post.id)}
                                                        disabled={post.status === 'posted'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Modal de Criação/Edição */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingPost ? 'Editar Post' : 'Agendar Novo Post'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Tipo de conteúdo */}
                            <div className="space-y-2">
                                <Label>Tipo de Conteúdo</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'image', icon: Image, label: 'Imagem' },
                                        { id: 'video', icon: Video, label: 'Vídeo' },
                                        { id: 'text', icon: Type, label: 'Texto' },
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setFormData(prev => ({ ...prev, content_type: type.id as any }))}
                                            className={cn(
                                                "flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors",
                                                formData.content_type === type.id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <type.icon size={20} />
                                            <span>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Upload de mídia */}
                            {formData.content_type !== 'text' && (
                                <div className="space-y-2">
                                    <Label>Mídia</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={formData.content_type === 'image' ? 'image/*' : 'video/*'}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    {formData.media_preview ? (
                                        <div className="relative rounded-lg overflow-hidden border">
                                            {formData.content_type === 'image' ? (
                                                <img
                                                    src={formData.media_preview}
                                                    alt="Preview"
                                                    className="w-full h-48 object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={formData.media_preview}
                                                    className="w-full h-48 object-cover"
                                                    controls
                                                />
                                            )}
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-2 right-2"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    media_file: null,
                                                    media_preview: ''
                                                }))}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-48 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground"
                                        >
                                            <Upload size={32} />
                                            <p>Clique para fazer upload</p>
                                            <p className="text-xs">
                                                {formData.content_type === 'image' ? 'JPG, PNG, GIF' : 'MP4, MOV, AVI'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Texto/Legenda */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>{formData.content_type === 'text' ? 'Texto do Status' : 'Legenda (opcional)'}</Label>
                                    {formData.content_type !== 'text' && (formData.media_preview || editingPost?.media_url) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={generateCaption}
                                            disabled={generatingCaption}
                                            className="text-xs gap-1 border-primary/50 hover:bg-primary/10"
                                        >
                                            {generatingCaption ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Gerando...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} className="text-primary" />
                                                    Gerar com IA
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <Textarea
                                    placeholder={formData.content_type === 'text' ? 'Digite o texto do status...' : 'Digite uma legenda ou clique em "Gerar com IA"...'}
                                    value={formData.text_content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                                    rows={3}
                                />
                            </div>

                            {/* Data e Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data</Label>
                                    <Input
                                        type="date"
                                        value={formData.scheduled_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora</Label>
                                    <Input
                                        type="time"
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Recorrência */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Recorrência</Label>
                                    <Select
                                        value={formData.recurrence_type}
                                        onValueChange={(v: any) => setFormData(prev => ({ ...prev, recurrence_type: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="once">Uma vez</SelectItem>
                                            <SelectItem value="daily">Diariamente</SelectItem>
                                            <SelectItem value="weekly">Semanalmente</SelectItem>
                                            <SelectItem value="monthly">Mensalmente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.recurrence_type === 'weekly' && (
                                    <div className="space-y-2">
                                        <Label>Dias da Semana</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS_OF_WEEK.map(day => (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleRecurrenceDay(day.id)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                        formData.recurrence_days.includes(day.id)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                                    )}
                                                >
                                                    {day.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.recurrence_type !== 'once' && (
                                    <div className="space-y-2">
                                        <Label>Data Final (opcional)</Label>
                                        <Input
                                            type="date"
                                            value={formData.recurrence_end_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseModal}>
                                Cancelar
                            </Button>
                            <Button variant="gold" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                {editingPost ? 'Atualizar' : 'Agendar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default StatusScheduler;
