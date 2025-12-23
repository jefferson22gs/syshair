import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ShoppingBag, Edit2, Trash2, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
}

const ProductsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: ''
  });

  useEffect(() => {
    fetchSalonId();
  }, [user]);

  useEffect(() => {
    if (salonId) fetchProducts();
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

  const fetchProducts = async () => {
    if (!salonId) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return;
    }
    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            category: formData.category || null,
            image_url: formData.image_url || null
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            salon_id: salonId,
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            category: formData.category || null,
            image_url: formData.image_url || null
          });

        if (error) throw error;
        toast.success("Produto criado!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      image_url: product.image_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Produto excluído!");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      image_url: ''
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
              Produtos
            </h1>
            <p className="text-muted-foreground">
              Gerencie produtos para venda no seu salão
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus size={18} className="mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Shampoo Profissional"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estoque</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Cabelo, Barba, Cuidados"
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gold" className="flex-1">
                    {editingProduct ? 'Salvar' : 'Criar Produto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nenhum produto cadastrado</p>
              <p className="text-sm text-muted-foreground">
                Adicione produtos para vender aos seus clientes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="glass-card overflow-hidden">
                <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={48} className="text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-foreground">{product.name}</h3>
                      {product.category && (
                        <span className="text-xs text-muted-foreground">{product.category}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(product.id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock > 0 
                        ? 'bg-success/20 text-success' 
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
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

export default ProductsPage;
