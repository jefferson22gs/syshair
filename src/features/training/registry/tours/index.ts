import type { TourDef } from "../../types";

/**
 * Todos os tours: qualquer `export const x: TourDef` em arquivos desta pasta entra automaticamente.
 * Este módulo só é carregado (import dinâmico) quando um tour é iniciado ou a Central é aberta.
 */
const modules = import.meta.glob<Record<string, unknown>>(["./*.ts", "!./index.ts"], { eager: true });

const isTour = (v: unknown): v is TourDef =>
  !!v && typeof v === "object" && "steps" in v && "route" in v && Array.isArray((v as TourDef).steps);

export const TOURS: TourDef[] = Object.values(modules).flatMap((mod) => Object.values(mod).filter(isTour));

const byId = new Map(TOURS.map((t) => [t.id, t]));

if (import.meta.env.DEV && byId.size !== TOURS.length) {
  console.warn("[training] existem tours com id duplicado");
}

export const getTour = (id: string) => byId.get(id);
