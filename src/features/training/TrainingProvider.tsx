/* eslint-disable react-refresh/only-export-components -- Contexto e hooks do mesmo recurso. */
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTrainingProgress, type SaveProgressInput } from "./useTrainingProgress";
import type { ProgressRecord, TourDef } from "./types";

const TourOverlay = lazy(() => import("./TourOverlay"));

interface ActiveTourState { tour: TourDef; step: number }
interface TrainingContextValue {
  salonId: string | null;
  isAdminArea: boolean;
  active: ActiveTourState | null;
  startTour: (tourId: string, fromStep?: number) => Promise<void>;
  goTo: (step: number) => void;
  next: () => void;
  back: () => void;
  pause: () => void;
  skip: () => void;
  finish: () => void;
  progress: {
    records: ProgressRecord[];
    isLoading: boolean;
    get: (key: string, version?: number) => ProgressRecord | undefined;
    save: (input: SaveProgressInput) => Promise<void>;
    resetAll: () => Promise<void>;
    error: string | null;
  };
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}
const TrainingContext = createContext<TrainingContextValue | null>(null);

function readStoredTour(key: string): { id: string; version: number; step: number } | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p.id !== "string" || !Number.isInteger(p.version) || !Number.isInteger(p.step)) return null;
    return { id: p.id, version: p.version as number, step: Math.max(0, p.step as number) };
  } catch { return null; }
}
function storeTour(key: string, value: { id: string; version: number; step: number } | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch { /* Indisponibilidade de storage não bloqueia o tour. */ }
}

function useCurrentSalonId(userId: string | undefined, enabled: boolean, pathname: string) {
  return useQuery({
    queryKey: ["training-salon", userId],
    // Mantém identidade estável durante navegação entre telas.
    refetchOnMount: pathname === "/admin",
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data: owned, error } = await supabase.from("salons").select("id").eq("owner_id", userId!).limit(1).maybeSingle();
      if (error) throw error;
      if (owned?.id) return owned.id;
      const { data: role, error: roleError } = await supabase.from("user_roles").select("salon_id")
        .eq("user_id", userId!).eq("role", "admin").not("salon_id", "is", null).limit(1).maybeSingle();
      if (roleError) throw roleError;
      return role?.salon_id ?? null;
    },
  });
}

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const isAdminArea = /^\/admin(?:\/|$)/.test(location.pathname) && Boolean(user) && isAdmin && !loading;
  const { data: salonId = null } = useCurrentSalonId(user?.id, isAdminArea, location.pathname);
  const progress = useTrainingProgress(isAdminArea ? user?.id : undefined, salonId);
  const { save } = progress;
  const [active, setActive] = useState<ActiveTourState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const restored = useRef<string | null>(null);
  const identity = `${user?.id ?? "anon"}:${salonId ?? "none"}`;
  const storageKey = `syshair.training.activeTour:${identity}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const request = useRef(0);

  const startTour = useCallback(async (tourId: string, fromStep = 0) => {
    if (!isAdminArea) return;
    const ticket = ++request.current;
    const owner = identity;
    const { getTour } = await import("./registry/tours");
    const tour = getTour(tourId);
    if (!tour?.steps.length || ticket !== request.current || owner !== identityRef.current) return;
    const step = Number.isFinite(fromStep) ? Math.min(Math.max(Math.floor(fromStep), 0), tour.steps.length - 1) : 0;
    setHelpOpen(false);
    setActive({ tour, step });
  }, [isAdminArea, identity]);

  // Limpa a sessão visual quando usuário ou salão muda. Nenhum progresso cruza contas.
  useEffect(() => {
    setActive(null);
    setHelpOpen(false);
    request.current++;
  }, [identity]);

  useEffect(() => {
    if (!isAdminArea || !salonId || restored.current === identity) return;
    const stored = readStoredTour(storageKey);
    if (!stored) { restored.current = identity; return; }
    let cancelled = false;
    void import("./registry/tours").then(({ getTour }) => {
      if (cancelled) return;
      restored.current = identity;
      const tour = getTour(stored.id);
      if (tour?.version === stored.version) void startTour(stored.id, stored.step);
      else storeTour(storageKey, null);
    });
    return () => { cancelled = true; };
  }, [identity, isAdminArea, salonId, storageKey, startTour]);

  // Etapa e versão sincronizadas entre dispositivos. localStorage é apenas recuperação transitória.
  useEffect(() => {
    if (!active) return;
    storeTour(storageKey, { id: active.tour.id, version: active.tour.version, step: active.step });
    void save({ key: active.tour.id, version: active.tour.version, kind: "tour", status: "in_progress", currentStep: active.step });
  }, [active, storageKey, save]);

  const end = useCallback((status: "completed" | "skipped" | "in_progress") => {
    request.current++;
    if (active) void save({ key: active.tour.id, version: active.tour.version, kind: "tour", status, currentStep: active.step });
    setActive(null);
    storeTour(storageKey, null);
  }, [active, save, storageKey]);
  const goTo = useCallback((step: number) => {
    setActive((current) => current ? { ...current, step: Math.min(Math.max(step, 0), current.tour.steps.length - 1) } : null);
  }, []);
  const next = useCallback(() => {
    if (!active) return;
    if (active.step >= active.tour.steps.length - 1) end("completed");
    else goTo(active.step + 1);
  }, [active, end, goTo]);
  const back = useCallback(() => { if (active) goTo(active.step - 1); }, [active, goTo]);
  const pause = useCallback(() => end("in_progress"), [end]);
  const skip = useCallback(() => end("skipped"), [end]);
  const finish = useCallback(() => end("completed"), [end]);

  useEffect(() => {
    if (!isAdminArea) { setActive(null); setHelpOpen(false); request.current++; }
  }, [isAdminArea]);

  const value = useMemo<TrainingContextValue>(() => ({
    salonId, isAdminArea, active, startTour, goTo, next, back, pause, skip, finish,
    progress: { records: progress.records, isLoading: progress.isLoading, get: progress.get, save, resetAll: progress.resetAll, error: progress.error },
    helpOpen, setHelpOpen,
  }), [salonId, isAdminArea, active, startTour, goTo, next, back, pause, skip, finish, progress.records, progress.isLoading, progress.get, save, progress.resetAll, progress.error, helpOpen]);

  return <TrainingContext.Provider value={value}>
    {children}
    {active && isAdminArea && <Suspense fallback={null}><TourOverlay /></Suspense>}
  </TrainingContext.Provider>;
}
export function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error("useTraining precisa estar dentro de <TrainingProvider>");
  return ctx;
}
export function useOptionalTraining() { return useContext(TrainingContext); }
