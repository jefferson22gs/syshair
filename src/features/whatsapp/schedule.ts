import { Temporal } from "@js-temporal/polyfill";

export type Recurrence = "once" | "daily" | "weekly" | "monthly";
export interface RecurrenceRule {
  type: Recurrence;
  timezone: string;
  localTime: string;
  /** Âncora do dia mensal (1–31), preservada mesmo ao limitar fevereiro. */
  anchorDay?: number;
  weekdays?: number[];
  endDate?: string;
}
/** Horários ambíguos/inexistentes requerem correção explícita, nunca são deslocados silenciosamente. */
export function localToInstant(local: string, timezone: string): string {
  return Temporal.PlainDateTime.from(local).toZonedDateTime(timezone, { disambiguation: "reject" }).toInstant().toString();
}
export function validTimezone(timezone: string): boolean {
  try { Temporal.Now.zonedDateTimeISO(timezone); return true; } catch { return false; }
}
export function nextOccurrence(previousInstant: string, nowInstant: string, rule: RecurrenceRule): string | null {
  if (rule.type === "once") return null;
  if (!validTimezone(rule.timezone)) throw new Error("Fuso inválido.");
  const previous = Temporal.Instant.from(previousInstant).toZonedDateTimeISO(rule.timezone);
  const now = Temporal.Instant.from(nowInstant).toZonedDateTimeISO(rule.timezone);
  const time = Temporal.PlainTime.from(rule.localTime);
  const end = rule.endDate ? Temporal.PlainDate.from(rule.endDate) : null;
  const base = Temporal.PlainDate.compare(previous.toPlainDate(), now.toPlainDate()) > 0 ? previous.toPlainDate() : now.toPlainDate();
  const weekdays = rule.weekdays?.length ? new Set(rule.weekdays.map(d => d === 0 ? 7 : d)) : new Set([previous.dayOfWeek]);
  if ([...weekdays].some(d => d < 1 || d > 7)) throw new Error("Dias inválidos.");
  const anchorDay = rule.anchorDay ?? previous.day;
  if (anchorDay < 1 || anchorDay > 31) throw new Error("Dia mensal inválido.");
  // Encontra somente a próxima ocorrência futura. Não fabrica backlog de publicações perdidas.
  for (let days = 0; days <= 370; days++) {
    const date = base.add({ days });
    if (end && Temporal.PlainDate.compare(date, end) > 0) return null;
    if (rule.type === "weekly" && !weekdays.has(date.dayOfWeek)) continue;
    if (rule.type === "monthly" && date.day !== Math.min(anchorDay, date.daysInMonth)) continue;
    const candidate = date.toPlainDateTime(time).toZonedDateTime(rule.timezone, { disambiguation: "reject" }).toInstant();
    if (Temporal.Instant.compare(candidate, Temporal.Instant.from(nowInstant)) > 0 && Temporal.Instant.compare(candidate, Temporal.Instant.from(previousInstant)) > 0) return candidate.toString();
  }
  throw new Error("Não foi possível calcular a próxima ocorrência.");
}
