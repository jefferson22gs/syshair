import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, QrCode, RefreshCw, CheckCircle, XCircle, Loader2, Wifi, WifiOff, MessageSquare, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AutomationSettings } from "@/features/whatsapp/AutomationSettings";

interface WhatsAppInstance {
  id: string;
  salon_id: string;
  instance_name: string;
  status: "disconnected" | "connecting" | "connected" | "qrcode";
  phone_number: string | null;
}
interface ConnectionResult {
  success: boolean;
  error?: string;
  status?: WhatsAppInstance["status"];
  phoneNumber?: string | null;
  qrcode?: string | null;
}
const columns = "id,salon_id,instance_name,status,phone_number";
const friendlyError = "Não foi possível concluir. Confira a conexão e tente novamente.";

export default function WhatsAppConnection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const polling = useRef(false);

  const call = useCallback(async (action: string, tenant: string): Promise<ConnectionResult> => {
    const { data, error: requestError } = await supabase.functions.invoke("whatsapp-instances", { body: { action, salonId: tenant } });
    if (requestError) throw new Error(friendlyError);
    const result = data as ConnectionResult | null;
    if (!result?.success) throw new Error(result?.error ?? friendlyError);
    return result;
  }, []);

  const refreshStatus = useCallback(async (tenant: string) => {
    if (polling.current) return;
    polling.current = true;
    const owner = identity.current;
    try {
      const result = await call("status", tenant);
      if (owner !== identity.current) return;
      setInstance((prev) => prev?.salon_id === tenant ? { ...prev, status: result.status ?? prev.status, phone_number: result.phoneNumber ?? prev.phone_number } : prev);
      if (result.status === "connected" || result.status === "disconnected") setQrCode(null);
      setError(null);
    } catch { if (owner === identity.current) setError("Não foi possível consultar a conexão do WhatsApp."); }
    finally { polling.current = false; }
  }, [call]);

  useEffect(() => {
    let cancelled = false;
    setSalonId(null); setInstance(null); setQrCode(null); setError(null); setLoading(true);
    async function load() {
      try {
        if (!user) return;
        const { data: salon, error: salonError } = await supabase.from("salons").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
        if (salonError) throw salonError;
        if (cancelled) return;
        if (!salon) { setError("Configure seu salão antes de conectar o WhatsApp."); return; }
        setSalonId(salon.id);
        const { data, error: instanceError } = await supabase.from("whatsapp_instances").select(columns).eq("salon_id", salon.id).maybeSingle();
        if (instanceError) throw instanceError;
        if (cancelled) return;
        setInstance(data as WhatsAppInstance | null);
        if (data) await refreshStatus(salon.id);
      } catch { if (!cancelled) setError("Não foi possível carregar o WhatsApp do salão."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [user, refreshStatus]);

  useEffect(() => {
    if (!salonId || !["qrcode", "connecting"].includes(instance?.status ?? "")) return;
    const interval = window.setInterval(() => void refreshStatus(salonId), 5000);
    return () => clearInterval(interval);
  }, [salonId, instance?.status, refreshStatus]);

  async function run(action: "create" | "connect" | "disconnect" | "delete") {
    if (!salonId || busy) return;
    if (action === "delete" && !window.confirm("Excluir esta conexão? Será necessário configurar e conectar novamente.")) return;
    if (action === "disconnect" && !window.confirm("Desconectar o WhatsApp? Mensagens automáticas ficarão indisponíveis até reconectar.")) return;
    const owner = identity.current;
    setBusy(action); setError(null);
    try {
      const result = await call(action, salonId);
      if (owner !== identity.current) return;
      if (action === "delete") { setInstance(null); setQrCode(null); }
      else if (action === "create") {
        const { data, error: reloadError } = await supabase.from("whatsapp_instances").select(columns).eq("salon_id", salonId).single();
        if (reloadError) throw reloadError;
        setInstance(data as WhatsAppInstance); setShowCreateModal(false);
      } else if (action === "connect") {
        setQrCode(result.qrcode ?? null);
        setInstance((prev) => prev ? { ...prev, status: result.status ?? "connecting" } : null);
      } else {
        setInstance((prev) => prev ? { ...prev, status: "disconnected", phone_number: null } : null); setQrCode(null);
      }
      toast({ title: action === "create" ? "Conexão cadastrada" : action === "connect" ? "Conectar pelo celular" : action === "delete" ? "Conexão excluída" : "WhatsApp desconectado", description: action === "connect" ? "Escaneie o código no WhatsApp do salão. Aguarde o status conectado." : undefined });
    } catch (err) {
      const message = err instanceof Error && err.message === friendlyError ? err.message : friendlyError;
      setError(message); toast({ title: "Não foi possível concluir", description: message, variant: "destructive" });
    } finally { if (owner === identity.current) setBusy(null); }
  }

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Carregando WhatsApp" /></div></AdminLayout>;
  const connected = instance?.status === "connected";
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center" data-tour="whatsapp-header">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3"><Smartphone className="w-8 h-8 text-primary" />Conexão WhatsApp</h1>
          <p className="text-muted-foreground mt-2">Conecte o WhatsApp do salão para mensagens, campanhas e atendimento automático.</p>
        </div>
        {error && <div className="rounded-lg border border-destructive/30 p-4 text-sm" role="alert">{error}</div>}
        {!instance ? (
          <Card className="border-dashed border-2" data-tour="whatsapp-empty"><CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-primary mb-4" /><h2 className="text-xl font-semibold">Conecte o WhatsApp do salão</h2>
            <p className="text-muted-foreground text-center my-4 max-w-md">Use o número do salão. Cada salão possui sua própria conexão, sem compartilhar mensagens com outros.</p>
            <Button variant="gold" disabled={!salonId} onClick={() => setShowCreateModal(true)} data-tour="whatsapp-create-button">Conectar WhatsApp</Button>
          </CardContent></Card>
        ) : (
          <>
            <Card><CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">{connected ? <CheckCircle className="text-green-600" /> : <XCircle className="text-muted-foreground" />}<div>
                <h2 className="text-xl font-semibold" data-tour="whatsapp-status">{connected ? "WhatsApp conectado" : instance.status === "connecting" || instance.status === "qrcode" ? "Aguardando conexão" : "WhatsApp desconectado"}</h2>
                {instance.phone_number && <p className="text-muted-foreground">+{instance.phone_number}</p>}
              </div></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!!busy} onClick={() => void refreshStatus(salonId!)} aria-label="Atualizar conexão"><RefreshCw size={18} /></Button>
                {connected ? <Button variant="destructive" disabled={!!busy} onClick={() => void run("disconnect")} data-tour="whatsapp-disconnect"><WifiOff size={16} className="mr-2" />Desconectar</Button>
                : <Button variant="gold" disabled={!!busy} onClick={() => void run("connect")} data-tour="whatsapp-connect-button">{busy === "connect" ? <Loader2 size={16} className="animate-spin mr-2" /> : <Wifi size={16} className="mr-2" />}Reconectar</Button>}
              </div>
            </CardContent></Card>
            {qrCode && <Card data-tour="whatsapp-qrcode"><CardHeader className="text-center"><CardTitle className="flex justify-center gap-2"><QrCode />Escaneie o QR Code</CardTitle><CardDescription>No celular: WhatsApp, Aparelhos conectados, Conectar aparelho.</CardDescription></CardHeader>
              <CardContent className="flex flex-col items-center"><div className="p-4 bg-white rounded-xl"><img src={qrCode} alt="Código temporário para conectar o WhatsApp do salão" className="w-64 h-64" /></div><p className="text-xs text-muted-foreground mt-3">Não compartilhe este código.</p><Button className="mt-4" variant="outline" disabled={!!busy} onClick={() => void run("connect")} data-tour="whatsapp-new-qrcode">Gerar novo QR Code</Button></CardContent>
            </Card>}
            {salonId && <AutomationSettings salonId={salonId} />}
            <Card data-tour="whatsapp-tips"><CardContent className="p-6 flex gap-3"><AlertCircle className="text-primary flex-shrink-0" /><div><h3 className="font-semibold">Mantenha sua conexão funcionando</h3><p className="text-sm text-muted-foreground mt-2">Confira o status antes de usar automações. Se desconectar, escaneie um novo código. O chatbot responde apenas quando você o habilita.</p></div></CardContent></Card>
            <div className="flex justify-end"><Button variant="ghost" className="text-destructive" disabled={!!busy} onClick={() => void run("delete")} data-tour="whatsapp-delete"><Trash2 size={16} className="mr-2" />Excluir conexão</Button></div>
          </>
        )}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}><DialogContent><DialogHeader><DialogTitle>Configurar conexão do salão</DialogTitle><DialogDescription>O sistema cria uma conexão exclusiva. Depois você escaneia o código pelo celular. Nenhuma mensagem será enviada neste cadastro.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowCreateModal(false)}>Voltar</Button><Button variant="gold" disabled={!!busy} onClick={() => void run("create")} data-tour="whatsapp-create-save">{busy === "create" && <Loader2 className="animate-spin mr-2" size={16} />}Criar conexão</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </AdminLayout>
  );
}
