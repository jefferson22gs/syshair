import { useState } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientLoyaltyCard } from "@/components/admin/LoyaltySystem";
import { WaitlistManager } from "@/components/admin/WaitlistManager";
import { ReferralProgram } from "@/components/admin/ReferralProgram";
import { Lookbook } from "@/components/admin/Lookbook";
import { BIPredictive } from "@/components/admin/BIPredictive";
import { GoalsCard } from "@/components/admin/GoalsCard";
import {
    Trophy,
    Clock,
    Share2,
    Image,
    Brain,
    Target
} from "lucide-react";

const AdvancedFeatures = () => {
    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">
                        Recursos Avançados
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Ferramentas inteligentes para maximizar seu negócio
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
                            <BIPredictive />
                        </TabsContent>

                        <TabsContent value="loyalty" className="mt-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <ClientLoyaltyCard
                                    clientName="Maria Silva"
                                    points={2450}
                                />
                                <div className="space-y-6">
                                    <div className="glass-card p-6 rounded-xl">
                                        <h3 className="font-display text-xl font-bold mb-4">Configurações de Pontos</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                                <span className="text-sm text-foreground">Pontos por R$ 1,00 gasto</span>
                                                <span className="font-bold text-primary">1 ponto</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                                <span className="text-sm text-foreground">Pontos por indicação</span>
                                                <span className="font-bold text-primary">100 pontos</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                                <span className="text-sm text-foreground">Pontos por avaliação</span>
                                                <span className="font-bold text-primary">10 pontos</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                                <span className="text-sm text-foreground">Multiplicador aniversário</span>
                                                <span className="font-bold text-primary">2x</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card p-6 rounded-xl">
                                        <h3 className="font-display text-xl font-bold mb-4">Resumo do Programa</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-4 rounded-xl bg-primary/10">
                                                <p className="text-2xl font-bold text-primary">156</p>
                                                <p className="text-xs text-muted-foreground">Clientes ativos</p>
                                            </div>
                                            <div className="text-center p-4 rounded-xl bg-green-500/10">
                                                <p className="text-2xl font-bold text-green-500">45.2K</p>
                                                <p className="text-xs text-muted-foreground">Pontos distribuídos</p>
                                            </div>
                                            <div className="text-center p-4 rounded-xl bg-purple-500/10">
                                                <p className="text-2xl font-bold text-purple-500">12</p>
                                                <p className="text-xs text-muted-foreground">Resgates no mês</p>
                                            </div>
                                            <div className="text-center p-4 rounded-xl bg-yellow-500/10">
                                                <p className="text-2xl font-bold text-yellow-500">R$ 850</p>
                                                <p className="text-xs text-muted-foreground">Valor resgatado</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="waitlist" className="mt-0">
                            <WaitlistManager />
                        </TabsContent>

                        <TabsContent value="referral" className="mt-0">
                            <div className="max-w-2xl mx-auto">
                                <ReferralProgram
                                    clientName="Maria Silva"
                                    referralCode="MARIA2024"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="lookbook" className="mt-0">
                            <Lookbook />
                        </TabsContent>

                        <TabsContent value="goals" className="mt-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <GoalsCard />
                                <div className="glass-card p-6 rounded-xl">
                                    <h3 className="font-display text-xl font-bold mb-4">Definir Nova Meta</h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        Configure metas personalizadas para acompanhar o crescimento do seu salão.
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Tipo de Meta</label>
                                            <select className="w-full mt-1 p-3 rounded-lg bg-secondary border border-border">
                                                <option>Faturamento</option>
                                                <option>Agendamentos</option>
                                                <option>Novos Clientes</option>
                                                <option>Avaliação Média</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Valor da Meta</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: 25000"
                                                className="w-full mt-1 p-3 rounded-lg bg-secondary border border-border"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-foreground">Período</label>
                                            <select className="w-full mt-1 p-3 rounded-lg bg-secondary border border-border">
                                                <option>Mensal</option>
                                                <option>Trimestral</option>
                                                <option>Anual</option>
                                            </select>
                                        </div>
                                        <button className="w-full p-3 rounded-lg bg-gradient-to-r from-primary to-gold-light text-primary-foreground font-medium">
                                            Criar Meta
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </AdminLayout>
    );
};

export default AdvancedFeatures;
