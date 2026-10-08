import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fixtures, USER_ID, SALON_ID, type DemoRow } from "./fixtures";

type Result = { data: unknown; error: null; count: number | null };
class DemoQuery implements PromiseLike<Result> {
  private filters: ((r: DemoRow) => boolean)[] = [];
  private singleResult = false;
  private head = false;
  private take = Infinity;
  private offset = 0;
  private action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private values: DemoRow[] = [];
  constructor(private table: string) {}
  select(_columns?: string, options?: { head?: boolean; count?: string }) { this.head = !!options?.head; return this; }
  eq(key: string, value: unknown) { this.filters.push((r) => r[key] === value); return this; }
  neq(key: string, value: unknown) { this.filters.push((r) => r[key] !== value); return this; }
  is(key: string, value: unknown) { return this.eq(key, value); }
  not(key: string, operator: string, value: unknown) { if (operator === "is") this.filters.push((r) => r[key] !== value); return this; }
  in(key: string, values: unknown[]) { this.filters.push((r) => values.includes(r[key])); return this; }
  gte(key: string, value: string | number) { this.filters.push((r) => String(r[key] ?? "") >= String(value)); return this; }
  lte(key: string, value: string | number) { this.filters.push((r) => String(r[key] ?? "") <= String(value)); return this; }
  gt(key: string, value: string | number) { this.filters.push((r) => String(r[key] ?? "") > String(value)); return this; }
  lt(key: string, value: string | number) { this.filters.push((r) => String(r[key] ?? "") < String(value)); return this; }
  ilike() { return this; }
  like() { return this; }
  or() { return this; }
  contains() { return this; }
  filter() { return this; }
  order() { return this; }
  limit(n: number) { this.take = n; return this; }
  range(from: number, to: number) { this.offset = from; this.take = to - from + 1; return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { this.singleResult = true; return this; }
  throwOnError() { return this; }
  abortSignal() { return this; }
  insert(values: DemoRow | DemoRow[]) { this.action = "insert"; this.values = Array.isArray(values) ? values : [values]; return this; }
  upsert(values: DemoRow | DemoRow[]) { this.action = "upsert"; this.values = Array.isArray(values) ? values : [values]; return this; }
  update(values: DemoRow) { this.action = "update"; this.values = [values]; return this; }
  delete() { this.action = "delete"; return this; }
  private execute(): Result {
    const rows = fixtures[this.table] ?? [];
    let result = rows.filter((r) => this.filters.every((f) => f(r)));
    // Somente progresso de treinamento persiste em memória. As outras operações são no-op.
    if (this.table === "user_training_progress" && this.action !== "select") {
      if (this.action === "update") result.forEach((r) => Object.assign(r, this.values[0]));
      if (this.action === "insert" || this.action === "upsert") for (const value of this.values) {
        const prev = rows.find((r) => r.user_id === value.user_id && r.salon_id === value.salon_id && r.item_key === value.item_key && r.item_version === value.item_version);
        if (prev) Object.assign(prev, value); else rows.push({ ...value, id: crypto.randomUUID() });
      }
      fixtures[this.table] = rows;
    } else if (this.action === "insert" || this.action === "upsert") result = this.values.map((r) => ({ ...r, id: crypto.randomUUID() }));
    const count = result.length;
    result = result.slice(this.offset, this.offset + this.take);
    return { data: this.head ? null : this.singleResult ? result[0] ?? null : result, error: null, count };
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve().then(() => this.execute()).then(onfulfilled, onrejected);
  }
}
const user = { id: USER_ID, email: "admin@example.invalid", app_metadata: {}, user_metadata: { full_name: "Administrador Demo" }, aud: "authenticated", created_at: new Date().toISOString() };
// Não é um token válido. Existe apenas para manter o formato esperado pelo código real.
const session = { user, access_token: "DEMO-NOT-A-TOKEN", refresh_token: "DEMO-NOT-A-TOKEN", token_type: "bearer", expires_at: 4102444800 };
const channel = { on() { return this; }, subscribe(callback?: (status: string) => void) { callback?.("SUBSCRIBED"); return this; }, unsubscribe: async () => undefined };
const mock = {
  from: (table: string) => new DemoQuery(table),
  rpc: async (name: string) => ({ data: name.includes("time_slots") ? ["09:00", "10:00", "11:00", "14:00"] : name.includes("salon") ? SALON_ID : [], error: null }),
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: { session, user }, error: null }),
    signUp: async () => ({ data: { session, user }, error: null }),
    signOut: async () => ({ error: null }),
    refreshSession: async () => ({ data: { session }, error: null }),
    updateUser: async () => ({ data: { user }, error: null }),
  },
  functions: { invoke: async () => ({ data: null, error: new Error("Integração desabilitada na demonstração") }) },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), upload: async () => ({ data: null, error: new Error("Upload desabilitado na demonstração") }), remove: async () => ({ data: [], error: null }), list: async () => ({ data: [], error: null }) }) },
  channel: () => Object.create(channel), removeChannel: async () => undefined, removeAllChannels: async () => undefined,
};
// Adaptação na fronteira de desenvolvimento: produção usa o SupabaseClient real, este arquivo nunca é importado por ele.
export const supabase = mock as unknown as SupabaseClient<Database>;
