import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ProgressKind, ProgressRecord, ProgressStatus } from "./types";

const COLUMNS = "item_key,item_version,kind,status,current_step,metadata,completed_at";
export const progressKey = (userId?: string, salonId?: string | null) => ["training-progress", userId ?? "anon", salonId ?? "none"] as const;
export interface SaveProgressInput {
  key: string;
  version: number;
  kind: ProgressKind;
  status: ProgressStatus;
  currentStep?: number;
  metadata?: Record<string, unknown>;
}

/** Progresso sincronizado. Erros são visíveis: nunca fingir que salvou entre dispositivos. */
export function useTrainingProgress(userId: string | undefined, salonId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => progressKey(userId, salonId), [userId, salonId]);
  const enabled = Boolean(userId && salonId);
  const [writeError, setWriteError] = useState<{ identity: string; message: string } | null>(null);
  const identity = `${userId}:${salonId}`;
  const { data: records = [], isLoading, error: readError } = useQuery({
    queryKey, enabled, staleTime: 60_000,
    queryFn: async (): Promise<ProgressRecord[]> => {
      const { data, error } = await supabase.from("user_training_progress").select(COLUMNS).eq("user_id", userId!).eq("salon_id", salonId!);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r, kind: r.kind as ProgressKind, status: r.status as ProgressStatus,
        metadata: (r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata) ? r.metadata : {}) as Record<string, unknown>,
      }));
    },
  });
  const get = useCallback((key: string, version?: number) => {
    const matching = records.filter((r) => r.item_key === key && (version === undefined || r.item_version === version));
    return matching.reduce<ProgressRecord | undefined>((best, r) => !best || r.item_version > best.item_version ? r : best, undefined);
  }, [records]);

  const save = useCallback(async (input: SaveProgressInput) => {
    if (!userId || !salonId) return;
    const previous = queryClient.getQueryData<ProgressRecord[]>(queryKey) ?? [];
    const prev = previous.find((r) => r.item_key === input.key && r.item_version === input.version);
    const metadata = { ...(prev?.metadata ?? {}), ...(input.metadata ?? {}) };
    const row = {
      user_id: userId, salon_id: salonId, item_key: input.key, item_version: input.version,
      kind: input.kind, status: input.status, current_step: input.currentStep ?? prev?.current_step ?? 0,
      metadata: metadata as Json,
      completed_at: input.status === "completed" ? new Date().toISOString() : null,
    };
    // Atualização confirmada, não otimista: uma falha não pode marcar conclusão persistente.
    const { error } = await supabase.from("user_training_progress").upsert(row, { onConflict: "user_id,salon_id,item_key,item_version" });
    if (error) {
      setWriteError({ identity, message: "Não foi possível salvar o progresso. Você pode continuar e tentar novamente mais tarde." });
      return;
    }
    setWriteError(null);
    queryClient.setQueryData<ProgressRecord[]>(queryKey, (old = []) => [
      ...old.filter((r) => !(r.item_key === input.key && r.item_version === input.version)),
      { ...row, metadata, kind: input.kind, status: input.status },
    ]);
  }, [userId, salonId, queryClient, queryKey, identity]);

  const resetAll = useCallback(async () => {
    if (!userId || !salonId) return;
    const current = queryClient.getQueryData<ProgressRecord[]>(queryKey) ?? [];
    const results = await Promise.all(current.filter((r) => r.kind === "tour" || r.kind === "welcome").map((r) =>
      supabase.from("user_training_progress").update({
        status: r.kind === "welcome" ? "in_progress" : "skipped", current_step: 0, completed_at: null,
        metadata: { ...r.metadata, reset: true } as Json,
      }).eq("user_id", userId).eq("salon_id", salonId).eq("item_key", r.item_key).eq("item_version", r.item_version),
    ));
    if (results.some((r) => r.error)) setWriteError({ identity, message: "Não foi possível reiniciar todo o progresso. Tente novamente." });
    else setWriteError(null);
    await queryClient.invalidateQueries({ queryKey });
  }, [userId, salonId, queryClient, queryKey, identity]);
  const error = readError ? "Seu progresso salvo está indisponível. O treinamento continua funcionando." : writeError?.identity === identity ? writeError.message : null;
  return { records, isLoading: enabled && isLoading, get, save, resetAll, enabled, error };
}
