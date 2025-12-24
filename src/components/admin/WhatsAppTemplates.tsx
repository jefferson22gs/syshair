import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    MessageSquare,
    Plus,
    Edit2,
    Trash2,
    Copy,
    Check,
    Calendar,
    Clock,
    Bell,
    Gift
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppTemplate {
    id: string;
    name: string;
    category: "confirmation" | "reminder" | "followup" | "promotion";
    message: string;
    variables: string[];
}

const defaultTemplates: WhatsAppTemplate[] = [
    {
        id: "1",
        name: "Confirmação de Agendamento",
        category: "confirmation",
        message: "Olá {{cliente}}! 👋\n\nSeu agendamento foi confirmado:\n\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n✂️ Serviço: {{servico}}\n👤 Profissional: {{profissional}}\n\nAté lá! 💇",
        variables: ["cliente", "data", "horario", "servico", "profissional"],
    },
    {
        id: "2",
        name: "Lembrete 24h",
        category: "reminder",
        message: "Oi {{cliente}}! 😊\n\nLembrando que você tem um agendamento amanhã:\n\n📅 {{data}} às {{horario}}\n✂️ {{servico}}\n\nTe esperamos! 💇‍♀️",
        variables: ["cliente", "data", "horario", "servico"],
    },
    {
        id: "3",
        name: "Lembrete 2h",
        category: "reminder",
        message: "Olá {{cliente}}! ⏰\n\nSeu horário é daqui a 2 horas:\n\n✂️ {{servico}} às {{horario}}\n\nJá está a caminho? 🚗",
        variables: ["cliente", "horario", "servico"],
    },
    {
        id: "4",
        name: "Pós-atendimento",
        category: "followup",
        message: "Oi {{cliente}}! 💖\n\nComo foi sua experiência conosco hoje?\n\nSe puder, deixe sua avaliação:\n⭐ {{link_avaliacao}}\n\nAgradecemos pela preferência! 🙏",
        variables: ["cliente", "link_avaliacao"],
    },
    {
        id: "5",
        name: "Promoção",
        category: "promotion",
        message: "Olá {{cliente}}! 🎉\n\nTemos uma promoção especial pra você:\n\n🎁 {{promocao}}\n💰 {{desconto}}\n\n📅 Válido até {{validade}}\n\nAgende agora: {{link}}",
        variables: ["cliente", "promocao", "desconto", "validade", "link"],
    },
];

const categoryIcons = {
    confirmation: Calendar,
    reminder: Clock,
    followup: Bell,
    promotion: Gift,
};

const categoryLabels = {
    confirmation: "Confirmação",
    reminder: "Lembrete",
    followup: "Pós-atendimento",
    promotion: "Promoção",
};

const categoryColors = {
    confirmation: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    reminder: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    followup: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    promotion: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function WhatsAppTemplates() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>(defaultTemplates);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        category: "confirmation" as WhatsAppTemplate["category"],
        message: "",
    });

    const handleCopy = (template: WhatsAppTemplate) => {
        navigator.clipboard.writeText(template.message);
        setCopiedId(template.id);
        toast.success("Template copiado!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSave = () => {
        if (!formData.name.trim() || !formData.message.trim()) {
            toast.error("Preencha todos os campos");
            return;
        }

        // Extract variables from message
        const variableRegex = /\{\{(\w+)\}\}/g;
        const variables: string[] = [];
        let match;
        while ((match = variableRegex.exec(formData.message)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        if (editingTemplate) {
            setTemplates(prev => prev.map(t =>
                t.id === editingTemplate.id
                    ? { ...t, ...formData, variables }
                    : t
            ));
            toast.success("Template atualizado!");
        } else {
            const newTemplate: WhatsAppTemplate = {
                id: Date.now().toString(),
                ...formData,
                variables,
            };
            setTemplates(prev => [...prev, newTemplate]);
            toast.success("Template criado!");
        }

        setIsDialogOpen(false);
        resetForm();
    };

    const handleEdit = (template: WhatsAppTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            category: template.category,
            message: template.message,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Excluir este template?")) {
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success("Template excluído");
        }
    };

    const resetForm = () => {
        setEditingTemplate(null);
        setFormData({ name: "", category: "confirmation", message: "" });
    };

    const categories = ["all", "confirmation", "reminder", "followup", "promotion"] as const;

    return (
        <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="text-primary" />
                    Templates WhatsApp
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button variant="gold" size="sm">
                            <Plus size={16} className="mr-2" />
                            Novo Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTemplate ? "Editar Template" : "Novo Template"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Template</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Confirmação de Agendamento"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["confirmation", "reminder", "followup", "promotion"] as const).map((cat) => {
                                        const Icon = categoryIcons[cat];
                                        return (
                                            <Button
                                                key={cat}
                                                type="button"
                                                variant={formData.category === cat ? "gold" : "outline"}
                                                size="sm"
                                                onClick={() => setFormData({ ...formData, category: cat })}
                                                className="justify-start"
                                            >
                                                <Icon size={14} className="mr-2" />
                                                {categoryLabels[cat]}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Mensagem</Label>
                                <Textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Use {{variavel}} para campos dinâmicos"
                                    rows={6}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {"{{cliente}}"}, {"{{data}}"}, {"{{horario}}"}, etc. para variáveis dinâmicas
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="gold" onClick={handleSave}>
                                Salvar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all">
                    <TabsList className="grid grid-cols-5 w-full mb-4">
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="confirmation">Confirmação</TabsTrigger>
                        <TabsTrigger value="reminder">Lembrete</TabsTrigger>
                        <TabsTrigger value="followup">Pós</TabsTrigger>
                        <TabsTrigger value="promotion">Promo</TabsTrigger>
                    </TabsList>

                    {categories.map((cat) => (
                        <TabsContent key={cat} value={cat} className="space-y-3">
                            {templates
                                .filter(t => cat === "all" || t.category === cat)
                                .map((template) => {
                                    const Icon = categoryIcons[template.category];
                                    return (
                                        <div
                                            key={template.id}
                                            className="p-4 rounded-xl bg-secondary/30 border border-border/50"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "p-1.5 rounded-lg border",
                                                        categoryColors[template.category]
                                                    )}>
                                                        <Icon size={14} />
                                                    </span>
                                                    <span className="font-medium">{template.name}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleCopy(template)}
                                                    >
                                                        {copiedId === template.id ? (
                                                            <Check size={14} className="text-success" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(template)}
                                                    >
                                                        <Edit2 size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleDelete(template.id)}
                                                    >
                                                        <Trash2 size={14} className="text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                                                {template.message}
                                            </pre>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {template.variables.map((v) => (
                                                    <span
                                                        key={v}
                                                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                                    >
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    );
}
