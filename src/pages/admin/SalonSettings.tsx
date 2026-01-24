import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Upload, Building2, Link2, Copy, ExternalLink, Globe, Bell } from "lucide-react";
import { NotificationSettings } from "@/components/pwa/NotificationPrompt";

interface SalonData {
  id?: string;
  name: string;
  business_name: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  opening_time: string;
  closing_time: string;
  working_days: number[];
  primary_color: string;
  logo_url: string;
  slug: string;
  description: string;
  public_booking_enabled: boolean;
}

const defaultSalon: SalonData = {
  name: "",
  business_name: "",
  cnpj: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  opening_time: "09:00",
  closing_time: "19:00",
  working_days: [1, 2, 3, 4, 5, 6],
  primary_color: "#D4AF37",
  logo_url: "",
  slug: "",
  description: "",
  public_booking_enabled: true,
};

const weekDays = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const SalonSettings = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<SalonData>(defaultSalon);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    fetchSalon();
  }, [user]);

  const fetchSalon = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSalon({
          id: data.id,
          name: data.name || "",
          business_name: data.business_name || "",
          cnpj: data.cnpj || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          email: data.email || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          opening_time: data.opening_time || "09:00",
          closing_time: data.closing_time || "19:00",
          working_days: data.working_days || [1, 2, 3, 4, 5, 6],
          primary_color: data.primary_color || "#D4AF37",
          logo_url: data.logo_url || "",
          slug: data.slug || "",
          description: data.description || "",
          public_booking_enabled: data.public_booking_enabled ?? true,
        });
        setIsNew(false);
      }
    } catch (error) {
      console.error("Error fetching salon:", error);
      toast.error("Erro ao carregar dados do salão");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!salon.name.trim()) {
      toast.error("Nome do salão é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const salonData = {
        name: salon.name,
        business_name: salon.business_name || null,
        cnpj: salon.cnpj || null,
        phone: salon.phone || null,
        whatsapp: salon.whatsapp || null,
        email: salon.email || null,
        address: salon.address || null,
        city: salon.city || null,
        state: salon.state || null,
        zip_code: salon.zip_code || null,
        opening_time: salon.opening_time || "09:00",
        closing_time: salon.closing_time || "19:00",
        working_days: salon.working_days,
        primary_color: salon.primary_color,
        logo_url: salon.logo_url || null,
        slug: salon.slug || null,
        description: salon.description || null,
        public_booking_enabled: salon.public_booking_enabled,
        owner_id: user.id,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('salons')
          .insert(salonData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Update user role to admin
        await supabase
          .from('user_roles')
          .update({ role: 'admin', salon_id: data.id })
          .eq('user_id', user.id);
        
        setSalon({ ...salon, id: data.id });
        setIsNew(false);
        toast.success("Salão criado com sucesso!");
      } else {
        const { error } = await supabase
          .from('salons')
          .update(salonData)
          .eq('id', salon.id);
        
        if (error) throw error;
        toast.success("Configurações salvas com sucesso!");
      }
    } catch (error: any) {
      console.error("Error saving salon:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    if (salon.working_days.includes(day)) {
      setSalon({ ...salon, working_days: salon.working_days.filter(d => d !== day) });
    } else {
      setSalon({ ...salon, working_days: [...salon.working_days, day].sort() });
    }
  };

  const getPublicLink = () => {
    if (!salon.slug) return "";
    return `${window.location.origin}/s/${salon.slug}`;
  };

  const copyLink = () => {
    const link = getPublicLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {isNew ? "Configurar Salão" : "Configurações do Salão"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew ? "Configure seu salão para começar" : "Gerencie as informações do seu estabelecimento"}
            </p>
          </div>
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            <Save size={18} className="mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Link Público - Card em destaque */}
        {!isNew && salon.slug && (
          <Card className="glass-card border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={20} className="text-primary" />
                Link Público de Agendamento
              </CardTitle>
              <CardDescription>
                Compartilhe este link com seus clientes para que eles possam agendar online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 font-mono text-sm truncate">
                  {getPublicLink()}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink} title="Copiar link">
                  <Copy size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => window.open(getPublicLink(), '_blank')}
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={18} />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="public_booking">Agendamento Online Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando desativado, clientes verão uma mensagem de indisponibilidade
                  </p>
                </div>
                <Switch
                  id="public_booking"
                  checked={salon.public_booking_enabled}
                  onCheckedChange={(checked) => setSalon({ ...salon, public_booking_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informações Básicas */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={20} className="text-primary" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Dados principais do seu estabelecimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Salão *</Label>
                <Input
                  id="name"
                  value={salon.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSalon({ 
                      ...salon, 
                      name: newName,
                      slug: salon.slug || generateSlug(newName)
                    });
                  }}
                  placeholder="Ex: Barbearia Premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug do Link Público</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/s/</span>
                  <Input
                    id="slug"
                    value={salon.slug}
                    onChange={(e) => setSalon({ ...salon, slug: generateSlug(e.target.value) })}
                    placeholder="meu-salao"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este será o endereço do seu link de agendamento
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={salon.description}
                  onChange={(e) => setSalon({ ...salon, description: e.target.value })}
                  placeholder="Breve descrição do seu salão para exibir na página pública"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_name">Razão Social</Label>
                <Input
                  id="business_name"
                  value={salon.business_name}
                  onChange={(e) => setSalon({ ...salon, business_name: e.target.value })}
                  placeholder="Ex: Barbearia Premium LTDA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={salon.cnpj}
                  onChange={(e) => setSalon({ ...salon, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={salon.phone}
                    onChange={(e) => setSalon({ ...salon, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={salon.whatsapp}
                    onChange={(e) => setSalon({ ...salon, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={salon.email}
                  onChange={(e) => setSalon({ ...salon, email: e.target.value })}
                  placeholder="contato@seudominio.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>Localização do seu estabelecimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={salon.address}
                  onChange={(e) => setSalon({ ...salon, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={salon.city}
                    onChange={(e) => setSalon({ ...salon, city: e.target.value })}
                    placeholder="Sua cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={salon.state}
                    onChange={(e) => setSalon({ ...salon, state: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={salon.zip_code}
                  onChange={(e) => setSalon({ ...salon, zip_code: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Horário de Funcionamento */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
              <CardDescription>Configure os dias e horários de atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Abertura</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={salon.opening_time}
                    onChange={(e) => setSalon({ ...salon, opening_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Fechamento</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={salon.closing_time}
                    onChange={(e) => setSalon({ ...salon, closing_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dias de Funcionamento</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWorkingDay(day.value)}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all
                        ${salon.working_days.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }
                      `}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalização */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Personalização</CardTitle>
              <CardDescription>Customize a aparência do seu salão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Principal</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    id="primary_color"
                    value={salon.primary_color}
                    onChange={(e) => setSalon({ ...salon, primary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                  />
                  <Input
                    value={salon.primary_color}
                    onChange={(e) => setSalon({ ...salon, primary_color: e.target.value })}
                    placeholder="#D4AF37"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo (URL)</Label>
                <Input
                  id="logo_url"
                  value={salon.logo_url}
                  onChange={(e) => setSalon({ ...salon, logo_url: e.target.value })}
                  placeholder="https://..."
                />
                {salon.logo_url && (
                  <div className="mt-2 p-4 bg-secondary rounded-lg">
                    <img 
                      src={salon.logo_url} 
                      alt="Logo preview" 
                      className="max-h-24 mx-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notificações Push */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} className="text-primary" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Receba alertas de novos agendamentos e lembretes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SalonSettings;
