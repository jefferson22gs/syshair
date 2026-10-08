import type { Article } from "../../types";
import { CATEGORIES } from "../categories";

/** Todos os artigos: qualquer `export const x: Article[]` em arquivos desta pasta entra automaticamente. */
const modules = import.meta.glob<Record<string, unknown>>(["./*.ts", "!./index.ts"], { eager: true });

const isArticle = (v: unknown): v is Article =>
  !!v && typeof v === "object" && "steps" in v && "summary" in v && "category" in v;

const order = new Map(CATEGORIES.map((c) => [c.id, c.order]));

export const ARTICLES: Article[] = Object.values(modules)
  .flatMap((mod) => Object.values(mod))
  .flatMap((v) => (Array.isArray(v) ? v.filter(isArticle) : []))
  .sort((a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99));

const byId = new Map(ARTICLES.map((a) => [a.id, a]));
export const getArticle = (id: string) => byId.get(id);
export const articlesByCategory = (category: string) => ARTICLES.filter((a) => a.category === category);
export const articlesForTour = (tourId: string) => ARTICLES.filter((a) => a.tourId === tourId);
