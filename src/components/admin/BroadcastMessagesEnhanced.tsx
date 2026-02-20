import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  FileText,
  Copy,
  Sparkles,
  Eye,
  StopCircle
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Contact {
  id?: string;
  phone: string;
  name: string;
  source: 'database' | 'whatsapp' | 'manual' | 'upload';
  selected?: boolean;
}

interface Broadcast {
  id: string;
  message: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'stopped' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface BroadcastMessage {
  id: string;
  broadcast_id: string;
  recipient_phone: string;
  recipient_name?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

interface BroadcastTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

export const BroadcastMessagesComponent = () => {
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
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);

  // Estados de modais
  const [showAddManual, setShowAddManual] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [manualNumbers, setManualNumbers] = useState("");

  // Template management
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Estados de estatísticas
  const [todayStats, setTodayStats] = useState({ sent: 0, limit: 5000, remaining: 5000 });
  const [isImproving, setIsImproving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (salonId) {
      loadBroadcasts();
      loadTemplates();
      loadTodayStats();
      checkActiveBroadcast();
    }
  }, [salonId]);

  // Polling para atualizar status de broadcasts ativos
  useEffect(() => {
    if (!activeBroadcastId) return;

    const interval = setInterval(() => {
      loadBroadcasts();
      loadTodayStats();
    }, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(interval);
  }, [activeBroadcastId]);

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

      // Verificar se há broadcast ativo
      const active = data.find(b => b.status === 'processing');
      setActiveBroadcastId(active?.id || null);
    }
  };

  const checkActiveBroadcast = async () => {
    if (!salonId) return;

    const { data } = await supabase
      .from("broadcasts")
      .select("id")
      .eq("salon_id", salonId)
      .eq("status", "processing")
      .maybeSingle();

    setActiveBroadcastId(data?.id || null);
  };

  const loadBroadcastMessages = async (broadcastId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("broadcast_messages")
        .select("*")
        .eq("broadcast_id", broadcastId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBroadcastMessages(data || []);
    } catch (error) {
      console.error("Error loading broadcast messages:", error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar os detalhes do disparo",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const stopBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase
        .from("broadcasts")
        .update({ status: "stopped" })
        .eq("id", broadcastId);

      if (error) throw error;

      toast({
        title: "Disparo interrompido",
        description: "O disparo foi parado com sucesso",
      });

      setActiveBroadcastId(null);
      loadBroadcasts();
    } catch (error: any) {
      console.error("Error stopping broadcast:", error);
      toast({
        title: "Erro ao parar disparo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewBroadcastDetails = async (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowHistoryModal(true);
    await loadBroadcastMessages(broadcast.id);
  };

  const loadTemplates = async () => {
    if (!salonId) return;

    const { data } = await supabase
      .from("broadcast_templates")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false });

    if (data) {
      setTemplates(data);
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
    const limit = 5000;

    setTodayStats({
      sent,
      limit,
      remaining: Math.max(0, limit - sent)
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

  const selectBatch = (size: number) => {
    const newContacts = [...contacts];
    // Desmarcar todos primeiro
    newContacts.forEach(c => c.selected = false);

    // Selecionar os primeiros 'size' contatos da lista atual (filtrada se houver busca, mas aqui aplicamos na lista completa por enquanto)
    // Se quiser respeitar o filtro visual:
    const targets = filteredContacts.slice(0, size);
    const targetIds = new Set(targets.map(c => c.phone));

    setContacts(prev => prev.map(c => ({
      ...c,
      selected: targetIds.has(c.phone)
    })));

    toast({
      title: "Seleção em Lote",
      description: `${Math.min(size, targets.length)} contatos selecionados.`,
    });
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
          name: `Contato ${phone}`,
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

  const saveTemplate = async () => {
    if (!templateName.trim() || !message.trim()) {
      toast({
        title: "Campos incompletos",
        description: "Preencha o nome e a mensagem do template.",
        variant: "destructive",
      });
      return;
    }

    if (!salonId) return;

    try {
      const { data, error } = await supabase
        .from("broadcast_templates")
        .insert({
          salon_id: salonId,
          name: templateName,
          content: message
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setTemplateName("");
      setShowTemplateModal(false);

      toast({
        title: "Template salvo",
        description: "Modelo de mensagem salvo com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const improveWithAI = async () => {
    if (!message.trim() || !salonId) return;

    setIsImproving(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Você precisa estar autenticado para usar a IA");
      }

      const { data, error } = await supabase.functions.invoke('generate-text-content', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          text: message,
          instruction: "Melhore este texto para uma mensagem de transmissão whatsapp. Mantenha curto, persuasivo e use emojis. Mantenha a variável {nome}.",
          salonId: salonId
        }
      });

      if (error) throw error;

      if (data?.text) {
        setMessage(data.text);
        toast({
          title: "Texto melhorado!",
          description: "A IA aprimorou sua mensagem.",
        });
      } else {
        throw new Error("Nenhum texto foi gerado pela IA");
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      toast({
        title: "Erro na IA",
        description: error.message || "Falha ao gerar texto. Verifique se a IA está configurada no Super Admin.",
        variant: "destructive"
      });
    } finally {
      setIsImproving(false);
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.content) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
      toast({
        title: "Template carregado",
        description: "Mensagem do template carregada.",
      });
    } else {
      toast({
        title: "Erro ao carregar template",
        description: "Template não encontrado ou sem conteúdo.",
        variant: "destructive",
      });
    }
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
      const recipients = selectedContacts.map(c => c.phone);

      const response = await supabase.functions.invoke('broadcast-messages', {
        body: {
          action: 'send_broadcast',
          salonId,
          instanceName,
          message: message.trim(),
          recipients: recipients
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro desconhecido na função');
      }

      if (!response.data) {
        throw new Error("Nenhuma resposta recebida do servidor");
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.success) {
        toast({
          title: "🚀 Disparo iniciado!",
          description: `${response.data.message}. Tempo estimado: ${response.data.estimatedTime}`,
          duration: 10000,
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
      let errorMsg = error.message || "Erro desconhecido";

      if (error.message.includes("fetch") || error.message.includes("network")) {
        errorMsg = "Falha na conexão com o servidor. Verifique sua internet.";
      } else if (error.message.includes("404")) {
        errorMsg = "Função de disparo não encontrada. Contate o suporte.";
      } else if (error.message.includes("500")) {
        errorMsg = "Erro interno do servidor. Tente novamente mais tarde.";
      }

      toast({
        title: "Erro ao enviar",
        description: errorMsg,
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
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" />
              WhatsApp Desconectado
            </CardTitle>
            <CardDescription>
              Conecte seu WhatsApp primeiro para usar o disparador de mensagens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/admin/whatsapp'}>
              Conectar WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Send className="text-primary" />
            Disparador de Mensagens
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Envie mensagens para seus clientes de forma segura e automática
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs md:text-sm text-muted-foreground">Limite diário</p>
            <p className="text-lg md:text-xl font-semibold">
              <span className="text-primary">{todayStats.remaining}</span>
              <span className="text-muted-foreground text-sm">/{todayStats.limit}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna de contatos */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Users size={20} />
                  Contatos ({contacts.length})
                </CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddManual(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <Plus size={16} className="mr-1" />
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadContacts}
                    disabled={loadingContacts}
                    className="flex-1 sm:flex-none"
                  >
                    {loadingContacts ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm">
                {selectedCount > 0 ? (
                  <span className="text-primary font-medium">{selectedCount} selecionados</span>
                ) : (
                  "Selecione os contatos que receberão a mensagem"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Busca e ações */}
              <div className="space-y-3 mb-4">
                <div className="relative w-full">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="🔍 Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAll(true)}
                    className="flex-1 sm:flex-none"
                  >
                    ✓ Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAll(false)}
                    className="flex-1 sm:flex-none"
                  >
                    ✗ Nenhum
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectBatch(100)}
                    title="Selecionar os primeiros 100 da lista"
                    className="flex-1 sm:flex-none"
                  >
                    100
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectBatch(500)}
                    title="Selecionar os primeiros 500 da lista"
                    className="flex-1 sm:flex-none"
                  >
                    500
                  </Button>
                </div>
              </div>

              {/* Lista de contatos */}
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm md:text-base">Nenhum contato carregado</p>
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
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="w-12 p-3 text-left">
                            <Checkbox
                              checked={selectedCount === contacts.length && contacts.length > 0}
                              onCheckedChange={(checked) => toggleAll(!!checked)}
                            />
                          </th>
                          <th className="p-3 text-left text-sm font-semibold">Nome</th>
                          <th className="p-3 text-left text-sm font-semibold hidden md:table-cell">Telefone</th>
                          <th className="p-3 text-left text-sm font-semibold hidden sm:table-cell">Origem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContacts.map((contact, index) => (
                          <tr
                            key={contact.phone}
                            className={`cursor-pointer transition-colors border-b last:border-b-0 ${
                              contact.selected
                                ? 'bg-primary/10 hover:bg-primary/15'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleContact(contact.phone)}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={contact.selected}
                                onCheckedChange={() => toggleContact(contact.phone)}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm md:text-base">{contact.name}</span>
                                <span className="text-xs text-muted-foreground md:hidden">{contact.phone}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm hidden md:table-cell">{contact.phone}</td>
                            <td className="p-3 hidden sm:table-cell">{getSourceBadge(contact.source)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredContacts.length === 0 && searchTerm && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Nenhum contato encontrado para "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna de mensagem */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <MessageSquare size={20} />
                Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Template</Label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplate || ""}
                    onChange={(e) => loadTemplate(e.target.value)}
                    className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">Selecione um template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTemplateModal(true)}
                    title="Salvar como template"
                  >
                    <FileText size={16} />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Texto da Mensagem</Label>
                <Textarea
                  placeholder="Digite sua mensagem aqui...&#10;&#10;💡 Dica: Use {nome} para personalizar com o nome do contato"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                  className="resize-none text-base"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {message.length} caracteres
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={improveWithAI}
                    disabled={isImproving || !message.trim()}
                    className="text-primary hover:bg-primary/10 text-xs"
                  >
                    {isImproving ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <Sparkles size={14} className="mr-1" />
                    )}
                    Melhorar com IA
                  </Button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  onClick={sendBroadcast}
                  disabled={isSending || selectedCount === 0 || !message.trim()}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={20} className="mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={20} className="mr-2" />
                      Enviar para {selectedCount} contato{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {selectedCount > 0 && (
                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">
                      ⏱️ Tempo estimado: ~{Math.ceil((selectedCount * 5) / 60)} minuto{Math.ceil((selectedCount * 5) / 60) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📊 Taxa de envio: 1 mensagem a cada 5 segundos
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">📋 Histórico de Disparos</CardTitle>
            </CardHeader>
            <CardContent>
              {broadcasts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum disparo realizado
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {broadcasts.slice(0, 5).map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className="p-3 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(broadcast.status)}
                          {broadcast.status === 'processing' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => stopBroadcast(broadcast.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <StopCircle size={12} className="mr-1" />
                              Parar
                            </Button>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(broadcast.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-2 text-muted-foreground">{broadcast.message}</p>
                      <div className="flex gap-4 text-xs mb-2">
                        <span className="text-green-400 font-medium">✓ {broadcast.sent_count || 0}</span>
                        <span className="text-red-400 font-medium">✗ {broadcast.failed_count || 0}</span>
                        <span className="text-muted-foreground">📊 {broadcast.total_recipients}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewBroadcastDetails(broadcast)}
                        className="w-full h-8 text-xs hover:bg-primary/10"
                      >
                        <Eye size={12} className="mr-1" />
                        Ver Detalhes
                      </Button>
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

      {/* Modal salvar template */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Template</Label>
              <Input
                placeholder="Ex: Mensagem de Promoção"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label>Conteúdo da Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate}>
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Histórico */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">📊 Detalhes do Disparo</DialogTitle>
          </DialogHeader>

          {selectedBroadcast && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Resumo */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Status</p>
                      <div className="flex justify-center">
                        {getStatusBadge(selectedBroadcast.status)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Total</p>
                      <p className="text-2xl font-bold">{selectedBroadcast.total_recipients}</p>
                    </div>
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Enviados</p>
                      <p className="text-2xl font-bold text-green-400">{selectedBroadcast.sent_count || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Falhas</p>
                      <p className="text-2xl font-bold text-red-400">{selectedBroadcast.failed_count || 0}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare size={16} />
                      Mensagem Enviada:
                    </p>
                    <p className="text-sm leading-relaxed">{selectedBroadcast.message}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Criado: {new Date(selectedBroadcast.created_at).toLocaleString('pt-BR')}
                    </span>
                    {selectedBroadcast.completed_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle size={12} />
                        Concluído: {new Date(selectedBroadcast.completed_at).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Mensagens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users size={18} />
                    Mensagens Individuais ({broadcastMessages.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadBroadcastMessages(selectedBroadcast.id)}
                    disabled={loadingMessages}
                  >
                    {loadingMessages ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </Button>
                </div>

                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={40} className="animate-spin text-primary" />
                  </div>
                ) : broadcastMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 bg-muted/30 rounded-lg">
                    <Users size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Nenhuma mensagem encontrada</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr>
                            <th className="p-3 text-left text-xs font-semibold">Status</th>
                            <th className="p-3 text-left text-xs font-semibold">Nome</th>
                            <th className="p-3 text-left text-xs font-semibold hidden md:table-cell">Telefone</th>
                            <th className="p-3 text-left text-xs font-semibold hidden sm:table-cell">Horário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {broadcastMessages.map((msg) => (
                            <tr
                              key={msg.id}
                              className={`border-b last:border-b-0 ${
                                msg.status === 'sent'
                                  ? 'bg-green-500/5 hover:bg-green-500/10'
                                  : msg.status === 'failed'
                                  ? 'bg-red-500/5 hover:bg-red-500/10'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <td className="p-3">
                                {msg.status === 'sent' ? (
                                  <CheckCircle size={18} className="text-green-400" />
                                ) : msg.status === 'failed' ? (
                                  <XCircle size={18} className="text-red-400" />
                                ) : (
                                  <Clock size={18} className="text-gray-400" />
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{msg.recipient_name || 'Sem nome'}</span>
                                  {msg.error_message && (
                                    <span className="text-xs text-red-400 mt-1">
                                      ⚠️ {msg.error_message}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground md:hidden">{msg.recipient_phone}</span>
                                </div>
                              </td>
                              <td className="p-3 text-sm hidden md:table-cell">{msg.recipient_phone}</td>
                              <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">
                                {msg.sent_at ? (
                                  new Date(msg.sent_at).toLocaleTimeString('pt-BR')
                                ) : (
                                  <span className="text-yellow-400">Pendente</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowHistoryModal(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};