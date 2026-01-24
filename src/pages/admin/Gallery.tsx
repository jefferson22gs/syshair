import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image, Plus, Eye, EyeOff, Link, Copy, Trash2 } from "lucide-react";

interface GalleryItem {
  id: string;
  before_image_url: string | null;
  after_image_url: string | null;
  description: string | null;
  visibility: string;
  share_token: string | null;
  created_at: string;
  client?: { name: string };
  professional?: { name: string };
  service?: { name: string };
}

interface Client {
  id: string;
  name: string;
}

const GalleryPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    before_image_url: '',
    after_image_url: '',
    description: '',
    visibility: 'private'
  });

  useEffect(() => {
    fetchSalonId();
  }, [user]);

  useEffect(() => {
    if (salonId) {
      fetchGallery();
      fetchClients();
    }
  }, [salonId]);

  const fetchSalonId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    
    if (data) setSalonId(data.id);
    setLoading(false);
  };

  const fetchGallery = async () => {
    if (!salonId) return;
    
    const { data, error } = await supabase
      .from('client_gallery')
      .select(`
        *,
        client:clients(name),
        professional:professionals(name),
        service:services(name)
      `)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching gallery:", error);
      return;
    }
    setGallery(data || []);
  };

  const fetchClients = async () => {
    if (!salonId) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('salon_id', salonId);

    setClients(data || []);
  };

  const generateShareToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId || !formData.client_id) return;

    try {
      const { error } = await supabase
        .from('client_gallery')
        .insert({
          salon_id: salonId,
          client_id: formData.client_id,
          before_image_url: formData.before_image_url || null,
          after_image_url: formData.after_image_url || null,
          description: formData.description || null,
          visibility: formData.visibility,
          share_token: formData.visibility === 'link' ? generateShareToken() : null
        });

      if (error) throw error;
      
      toast.success("Imagem adicionada!");
      setIsDialogOpen(false);
      resetForm();
      fetchGallery();
    } catch (error) {
      console.error("Error saving gallery item:", error);
      toast.error("Erro ao salvar imagem");
    }
  };

  const toggleVisibility = async (id: string, currentVisibility: string) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    
    try {
      const { error } = await supabase
        .from('client_gallery')
        .update({ visibility: newVisibility })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Visibilidade alterada para ${newVisibility === 'public' ? 'pública' : 'privada'}`);
      fetchGallery();
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Erro ao alterar visibilidade");
    }
  };

  const copyShareLink = (token: string) => {
    const link = `${window.location.origin}/gallery/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta imagem?")) return;

    try {
      const { error } = await supabase
        .from('client_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Imagem excluída!");
      fetchGallery();
    } catch (error) {
      console.error("Error deleting gallery item:", error);
      toast.error("Erro ao excluir imagem");
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      before_image_url: '',
      after_image_url: '',
      description: '',
      visibility: 'private'
    });
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Galeria Antes & Depois
            </h1>
            <p className="text-muted-foreground">
              Documente transformações e compartilhe resultados
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus size={18} className="mr-2" />
                Nova Transformação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Transformação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>URL Imagem Antes</Label>
                  <Input
                    value={formData.before_image_url}
                    onChange={(e) => setFormData({ ...formData, before_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL Imagem Depois</Label>
                  <Input
                    value={formData.after_image_url}
                    onChange={(e) => setFormData({ ...formData, after_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da transformação"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visibilidade</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Privada</SelectItem>
                      <SelectItem value="public">Pública</SelectItem>
                      <SelectItem value="link">Compartilhável por link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gold" className="flex-1">
                    Adicionar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Gallery Grid */}
        {gallery.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Image size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma transformação registrada</p>
              <p className="text-sm text-muted-foreground">
                Adicione fotos antes e depois dos seus trabalhos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((item) => (
              <Card key={item.id} className="glass-card overflow-hidden">
                <div className="grid grid-cols-2 gap-1">
                  <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                    {item.before_image_url ? (
                      <img 
                        src={item.before_image_url} 
                        alt="Antes"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Image size={24} className="text-muted-foreground mx-auto" />
                        <span className="text-xs text-muted-foreground">Antes</span>
                      </div>
                    )}
                  </div>
                  <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                    {item.after_image_url ? (
                      <img 
                        src={item.after_image_url} 
                        alt="Depois"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Image size={24} className="text-muted-foreground mx-auto" />
                        <span className="text-xs text-muted-foreground">Depois</span>
                      </div>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{item.client?.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => toggleVisibility(item.id, item.visibility)}
                      >
                        {item.visibility === 'public' ? (
                          <Eye size={14} className="text-success" />
                        ) : (
                          <EyeOff size={14} className="text-muted-foreground" />
                        )}
                      </Button>
                      {item.share_token && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyShareLink(item.share_token!)}
                        >
                          <Copy size={14} />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.visibility === 'public' 
                        ? 'bg-success/20 text-success'
                        : item.visibility === 'link'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.visibility === 'public' && 'Pública'}
                      {item.visibility === 'private' && 'Privada'}
                      {item.visibility === 'link' && 'Link'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GalleryPage;
