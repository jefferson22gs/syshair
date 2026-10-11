import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { objectValue, WhatsAppError } from "./errors.ts";
import { validUuid } from "./auth.ts";

export interface BotContext { db: SupabaseClient; salonId: string; phone: string; eventId?: string; preview: boolean }
export const tools = [
  { type: "function", function: { name: "salon_info", description: "Informações públicas cadastradas do salão.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "services", description: "Serviços ativos, preço e duração reais.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "professionals", description: "Profissionais ativos deste salão.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
  { type: "function", function: { name: "available_slots", description: "Horários disponíveis. Só retorna horários, nunca dados de outros clientes.", parameters: { type: "object", properties: { serviceId: { type: "string" }, professionalId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["serviceId", "professionalId", "date"], additionalProperties: false } } },
  { type: "function", function: { name: "prepare_booking", description: "Prepara proposta sem criar reserva. A pessoa precisa responder CONFIRMAR para finalizar.", parameters: { type: "object", properties: { serviceId: { type: "string" }, professionalId: { type: "string" }, date: { type: "string" }, start: { type: "string", description: "HH:mm" }, name: { type: "string" } }, required: ["serviceId", "professionalId", "date", "start", "name"], additionalProperties: false } } },
  { type: "function", function: { name: "my_appointments", description: "Somente agendamentos futuros do remetente desta conversa.", parameters: { type: "object", properties: {}, additionalProperties: false } } },
] as const;

function dateArg(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new WhatsAppError("invalid_request");
  return value;
}
export async function executeBotTool(ctx: BotContext, name: string, raw: unknown): Promise<unknown> {
  const args = objectValue(raw);
  // Nenhum salon_id, telefone alvo, SQL ou campo extra é aceito de um modelo.
  const allowed: Record<string, string[]> = { salon_info: [], services: [], professionals: [], available_slots: ["serviceId", "professionalId", "date"], prepare_booking: ["serviceId", "professionalId", "date", "start", "name"], my_appointments: [] };
  if (!allowed[name] || Object.keys(args).some(k => !allowed[name].includes(k))) throw new WhatsAppError("invalid_request");
  if (name === "salon_info") {
    const { data, error } = await ctx.db.from("salons").select("name,address,city,state,phone,working_hours,opening_time,closing_time,timezone").eq("id", ctx.salonId).single();
    if (error) throw new WhatsAppError("persistence_failed", 503); return data;
  }
  if (name === "services" || name === "professionals") {
    const { data, error } = await ctx.db.from(name).select(name === "services" ? "id,name,price,duration_minutes" : "id,name,specialty").eq("salon_id", ctx.salonId).eq("is_active", true).limit(100);
    if (error) throw new WhatsAppError("persistence_failed", 503); return data;
  }
  if (name === "my_appointments") {
    if (ctx.preview) return { notice: "Teste não consulta agendamentos de clientes reais." };
    const { data, error } = await ctx.db.from("appointments").select("id,date,start_time,status,services(name),professionals(name)").eq("salon_id", ctx.salonId).eq("client_phone", ctx.phone).in("status", ["pending", "confirmed"]).gte("date", new Date().toISOString().slice(0, 10)).limit(5);
    if (error) throw new WhatsAppError("persistence_failed", 503); return data;
  }
  if (!validUuid(args.serviceId) || !validUuid(args.professionalId)) throw new WhatsAppError("invalid_request");
  const date = dateArg(args.date);
  const [{ data: service, error: se }, { data: professional, error: pe }] = await Promise.all([
    ctx.db.from("services").select("id,name,price,duration_minutes").eq("id", args.serviceId).eq("salon_id", ctx.salonId).eq("is_active", true).maybeSingle(),
    ctx.db.from("professionals").select("id,name").eq("id", args.professionalId).eq("salon_id", ctx.salonId).eq("is_active", true).maybeSingle(),
  ]);
  if (se || pe) throw new WhatsAppError("persistence_failed", 503);
  if (!service || !professional) throw new WhatsAppError("invalid_request");
  const { data: slots, error: slotError } = await ctx.db.rpc("get_available_time_slots", { p_salon_id: ctx.salonId, p_service_id: service.id, p_professional_id: professional.id, p_date: date });
  if (slotError) throw new WhatsAppError("persistence_failed", 503);
  if (name === "available_slots") return { date, service: service.name, professional: professional.name, slots: slots ?? [] };
  if (typeof args.start !== "string" || !/^\d{2}:\d{2}$/.test(args.start) || !Array.isArray(slots) || !slots.includes(args.start) || typeof args.name !== "string" || !args.name.trim() || args.name.length > 120) return { error: "Horário indisponível ou nome ausente. Consulte horários novamente." };
  const { data: cfg } = await ctx.db.from("whatsapp_automation_settings").select("chatbot_booking_enabled").eq("salon_id", ctx.salonId).maybeSingle();
  if (!cfg?.chatbot_booking_enabled) return { notice: "Agendamento por chatbot não está habilitado. Encaminhe à equipe." };
  const proposal = { kind: "booking", serviceId: service.id, professionalId: professional.id, date, start: args.start, name: args.name.trim(), requestKey: crypto.randomUUID() };
  if (!ctx.preview) {
    const { error } = await ctx.db.from("whatsapp_conversation_state").upsert({ salon_id: ctx.salonId, phone: ctx.phone, pending_action: proposal, pending_action_expires_at: new Date(Date.now() + 600_000).toISOString() }, { onConflict: "salon_id,phone" });
    if (error) throw new WhatsAppError("persistence_failed", 503);
  }
  return { proposal: true, summary: `${service.name} com ${professional.name}, ${date} às ${args.start}, R$ ${Number(service.price).toFixed(2)}.`, instructions: "Peça para a pessoa responder CONFIRMAR. Nenhuma reserva foi criada; disponibilidade será verificada de novo.", preview: ctx.preview };
}

export function deterministicIntent(text: string): "human" | "opt_out" | "confirm" | "none" {
  const normalized = text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  if (["confirmar", "confirmo"].includes(normalized)) return "confirm";
  if (/^(parar|sair|nao quero (?:mais )?(?:receber )?(?:mensagens|promocoes)|cancelar mensagens)$/.test(normalized)) return "opt_out";
  // "quero agendar para outra pessoa" não é pedido de atendimento humano.
  if (/\b(atendente|humano|pessoa real|uma pessoa|alguem da equipe)\b/.test(normalized) && /\b(falar|chama|chame|chamar|preciso|transferir)\b/.test(normalized)) return "human";
  return "none";
}
