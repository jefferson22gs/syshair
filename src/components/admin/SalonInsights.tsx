import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  Clock, 
  Users, 
  TrendingUp,
  X,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  LucideIcon
} from "lucide-react";

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  message: string;
  priority: string;
  action_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface SalonInsightsProps {
  salonId: string;
}

const priorityColors: Record<string, string> = {
  urgent: "from-destructive to-red-600",
  high: "from-warning to-orange-500",
  medium: "from-primary to-gold-light",
  low: "from-blue-500 to-cyan-500"
};

const typeIcons: Record<string, LucideIcon> = {
  idle_hours: Clock,
  inactive_clients: Users,
  busy_professional: TrendingUp,
  revenue_trend: TrendingUp,
  suggestion: Lightbulb
};

export const SalonInsights = ({ salonId }: SalonInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
    generateInsights();
  }, [salonId]);

  const generateInsights = async () => {
    try {
      await supabase.rpc('generate_salon_insights', { p_salon_id: salonId });
    } catch (error) {
      console.error("Error generating insights:", error);
    }
  };

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('salon_insights')
        .select('id, insight_type, title, message, priority, action_type, is_read, created_at')
        .eq('salon_id', salonId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error("Error fetching insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissInsight = async (id: string) => {
    await supabase.from('salon_insights').update({ is_dismissed: true }).eq('id', id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={20} className="text-primary" />Assistente Inteligente</CardTitle></CardHeader>
        <CardContent><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/50 rounded-lg" />)}</div></CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={20} className="text-primary" />Assistente Inteligente</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4"><Lightbulb size={32} className="text-success" /></div>
            <p className="font-medium text-foreground mb-1">Tudo em ordem! ✨</p>
            <p className="text-sm text-muted-foreground">Nenhum insight no momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={20} className="text-primary" />Assistente Inteligente</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const Icon = typeIcons[insight.insight_type] || Lightbulb;
          const colorClass = priorityColors[insight.priority] || priorityColors.medium;
          return (
            <div key={insight.id} className="relative p-4 rounded-xl bg-secondary/50 border border-border/50">
              <button onClick={() => dismissInsight(insight.id)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary"><X size={14} className="text-muted-foreground" /></button>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}><Icon size={20} className="text-white" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{insight.title}</p>
                    {insight.priority === 'urgent' && <AlertTriangle size={14} className="text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{insight.message}</p>
                  {insight.action_type && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-primary" onClick={() => window.location.href = insight.action_type === 'send_coupon' ? '/admin/coupons' : '/admin/clients'}>
                      <span className="text-xs">{insight.action_type === 'send_coupon' ? 'Criar cupom' : 'Ver clientes'}</span><ChevronRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
