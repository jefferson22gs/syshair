import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WhatsAppError } from "./errors.ts";

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new WhatsAppError("configuration_missing", 503);
  return value;
}
export function serviceClient(): SupabaseClient {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}
function bearer(req: Request): string {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new WhatsAppError("unauthorized", 401);
  return token;
}
export function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export async function authorizeSalon(req: Request, db: SupabaseClient, salonId: unknown): Promise<string> {
  if (!validUuid(salonId)) throw new WhatsAppError("invalid_request");
  const { data, error } = await db.auth.getUser(bearer(req));
  if (error || !data.user) throw new WhatsAppError("unauthorized", 401);
  const userId = data.user.id;
  const { data: salon, error: salonError } = await db.from("salons").select("id,owner_id").eq("id", salonId).maybeSingle();
  if (salonError) throw new WhatsAppError("persistence_failed", 503);
  if (salon?.owner_id === userId) return userId;
  if (!salon) throw new WhatsAppError("forbidden", 403);
  const { data: roles, error: roleError } = await db.from("user_roles").select("id").eq("user_id", userId).eq("salon_id", salonId).eq("role", "admin").limit(1);
  if (roleError) throw new WhatsAppError("persistence_failed", 503);
  if (!roles?.length) throw new WhatsAppError("forbidden", 403);
  return userId;
}
/** Workers não aceitam JWT de cliente nem confiam em um claim role não verificado. */
export function authorizeWorker(req: Request): void {
  if (!safeEqual(bearer(req), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"))) throw new WhatsAppError("forbidden", 403);
}
export function safeEqual(a: string, b: string): boolean {
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) diff |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}
export interface SalonInstance { id: string; salon_id: string; instance_name: string; status: string; phone_number: string | null }
export async function salonInstance(db: SupabaseClient, salonId: string): Promise<SalonInstance> {
  const { data, error } = await db.from("whatsapp_instances").select("id,salon_id,instance_name,status,phone_number").eq("salon_id", salonId).maybeSingle();
  if (error) throw new WhatsAppError("persistence_failed", 503);
  if (!data) throw new WhatsAppError("instance_missing", 409);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(data.instance_name)) throw new WhatsAppError("configuration_missing", 503);
  return data;
}
