import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealLoyaltySystem } from "@/components/admin/RealLoyaltySystem";
import { RealWaitlistManager } from "@/components/admin/RealWaitlistManager";
import { RealGoalsManager } from "@/components/admin/RealGoalsManager";
import { RealReferralProgram } from "@/components/admin/RealReferralProgram";
import { RealBIPredictive } from "@/components/admin/RealBIPredictive";
import { Lookbook } from "@/components/admin/Lookbook";
import { supabase } from "@/integrations/supabase/client";
import {
    Trophy,
    Clock,
    Share2,
    Image,
    Brain,
    Target,
    RefreshCw
} from "lucide-react";

const AdvancedFeatures = () => {
    const [salonId, setSalonId] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSalon();
    }, []);

    const loadSalon = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: salon } = await supabase
                .from('salons')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (salon) {
                setSalonId(salon.id);
            }
        } catch (error) {
            console.error('Erro ao carregar salão:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
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
                        Recursos Avançados
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Ferramentas inteligentes com dados reais do seu salão
                    </p>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="bi" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 h-auto gap-2 bg-transparent p-0">
                        <TabsTrigger
                            value="bi"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Brain size={16} />
                            <span className="hidden sm:inline">BI & IA</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="loyalty"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Trophy size={16} />
                            <span className="hidden sm:inline">Fidelidade</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="waitlist"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Clock size={16} />
                            <span className="hidden sm:inline">Fila de Espera</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="referral"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Share2 size={16} />
                            <span className="hidden sm:inline">Indicações</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="lookbook"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Image size={16} />
                            <span className="hidden sm:inline">Lookbook</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="goals"
                            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Target size={16} />
                            <span className="hidden sm:inline">Metas</span>
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="bi" className="mt-0">
                            {salonId ? (
                                <RealBIPredictive salonId={salonId} />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Salão não encontrado
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="loyalty" className="mt-0">
                            {salonId ? (
                                <RealLoyaltySystem salonId={salonId} />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Salão não encontrado
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="waitlist" className="mt-0">
                            {salonId ? (
                                <RealWaitlistManager salonId={salonId} />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Salão não encontrado
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="referral" className="mt-0">
                            {salonId ? (
                                <RealReferralProgram salonId={salonId} />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Salão não encontrado
                                </p>
                            )}
                        </TabsContent>

                        <TabsContent value="lookbook" className="mt-0">
                            <Lookbook />
                        </TabsContent>

                        <TabsContent value="goals" className="mt-0">
                            {salonId ? (
                                <RealGoalsManager salonId={salonId} />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Salão não encontrado
                                </p>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </AdminLayout>
    );
};

export default AdvancedFeatures;
