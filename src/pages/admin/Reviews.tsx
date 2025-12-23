import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, MessageSquare, User, Send } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  response_at: string | null;
  is_public: boolean;
  created_at: string;
  client?: { name: string };
  professional?: { name: string };
}

const ReviewsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchSalonId();
  }, [user]);

  useEffect(() => {
    if (salonId) fetchReviews();
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

  const fetchReviews = async () => {
    if (!salonId) return;
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        client:clients(name),
        professional:professionals(name)
      `)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      return;
    }
    
    setReviews(data || []);
    
    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAverageRating(avg);
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          response: responseText,
          response_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      
      toast.success("Resposta enviada!");
      setRespondingTo(null);
      setResponseText("");
      fetchReviews();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Erro ao enviar resposta");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-primary fill-primary' : 'text-muted-foreground'}
          />
        ))}
      </div>
    );
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
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Avaliações
          </h1>
          <p className="text-muted-foreground">
            Gerencie as avaliações dos seus clientes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-gold-light flex items-center justify-center">
                  <Star size={24} className="text-primary-foreground fill-primary-foreground" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {averageRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Média geral</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {reviews.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Send size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {reviews.filter(r => r.response).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Respondidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma avaliação ainda</p>
              <p className="text-sm text-muted-foreground">
                As avaliações dos clientes aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User size={20} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{review.client?.name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          para {review.professional?.name || 'Profissional'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {renderStars(review.rating)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-foreground mb-4 p-3 rounded-lg bg-secondary/50">
                      "{review.comment}"
                    </p>
                  )}

                  {review.response ? (
                    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Sua resposta:</p>
                      <p className="text-sm text-foreground">{review.response}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Respondido em {new Date(review.response_at!).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ) : respondingTo === review.id ? (
                    <div className="mt-4 space-y-2">
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Escreva sua resposta..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseText("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => handleSubmitResponse(review.id)}
                        >
                          <Send size={14} className="mr-2" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      <MessageSquare size={14} className="mr-2" />
                      Responder
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReviewsPage;
