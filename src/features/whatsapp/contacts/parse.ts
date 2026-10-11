import Papa from "papaparse";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "./phone";

export interface RawContact { name: string; phones: string[]; email?: string; error?: string }
export interface PreviewContact { name: string; phone: string | null; email?: string; status: "new" | "existing" | "duplicate" | "invalid"; reason?: string; selected: boolean }
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CONTACTS = 10_000;
const unescape = (value: string) => value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
function decodeValue(value: string, encoding?: string, charset = "UTF-8") {
  if (!encoding) return unescape(value);
  if (!["UTF-8", "UTF8", "ISO-8859-1", "LATIN1", "WINDOWS-1252"].includes(charset.toUpperCase())) throw new Error("Codificação de texto não suportada.");
  let bytes: Uint8Array;
  if (/^(b|base64)$/i.test(encoding)) bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  else if (/^quoted-printable$/i.test(encoding)) {
    const parts: number[] = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "=" && /^[A-Fa-f0-9]{2}$/.test(value.slice(i + 1, i + 3))) { parts.push(parseInt(value.slice(i + 1, i + 3), 16)); i += 2; }
      else parts.push(...new TextEncoder().encode(value[i]));
    }
    bytes = Uint8Array.from(parts);
  } else throw new Error("Codificação de vCard não suportada.");
  return unescape(new TextDecoder(charset.toLowerCase(), { fatal: true }).decode(bytes));
}
export function parseVcf(text: string): RawContact[] {
  if (text.length > MAX_FILE_BYTES) throw new Error("Arquivo acima de 5 MB.");
  const lines = text.replace(/\r\n?/g, "\n").replace(/=\n/g, "").replace(/\n[ \t]/g, "").split("\n");
  const contacts: RawContact[] = [];
  let current: RawContact | null = null;
  for (const line of lines) {
    if (/^BEGIN:VCARD$/i.test(line)) { if (current) contacts.push({ ...current, error: "vCard incompleto." }); current = { name: "", phones: [] }; continue; }
    if (!current) continue;
    if (/^END:VCARD$/i.test(line)) { contacts.push(current); current = null; if (contacts.length > MAX_CONTACTS) throw new Error("Limite de 10.000 contatos."); continue; }
    const colon = line.indexOf(":"); if (colon < 0) continue;
    const descriptor = line.slice(0, colon).split(";");
    const property = descriptor[0].split(".").pop()?.toUpperCase();
    const params = new Map(descriptor.slice(1).map(p => { const i = p.indexOf("="); return [p.slice(0, i).toUpperCase(), p.slice(i + 1).replace(/^"|"$/g, "")]; }));
    try {
      const value = decodeValue(line.slice(colon + 1), params.get("ENCODING"), params.get("CHARSET"));
      if (property === "VERSION" && !["2.1", "3.0", "4.0"].includes(value)) current.error = "Versão vCard não suportada.";
      if (property === "FN") current.name = value.slice(0, 120);
      if (property === "N" && !current.name) current.name = value.split(";").filter(Boolean).reverse().join(" ").slice(0, 120);
      if (property === "TEL") current.phones.push(value);
      if (property === "EMAIL" && !current.email) current.email = value.slice(0, 254);
    } catch (error) { current.error = error instanceof Error ? error.message : "Contato inválido."; }
  }
  if (current) contacts.push({ ...current, error: "vCard incompleto." });
  if (!contacts.length) throw new Error("Nenhum vCard encontrado.");
  return contacts;
}
export interface CsvData { headers: string[]; rows: Record<string, string>[]; detected: { name: string; phone: string; email: string } }
const label = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
export function readCsv(text: string): CsvData {
  if (text.length > MAX_FILE_BYTES) throw new Error("Arquivo acima de 5 MB.");
  const parsed = Papa.parse<Record<string, string>>(text.replace(new RegExp("^" + String.fromCharCode(0xfeff)), ""), { header: true, skipEmptyLines: "greedy", preview: MAX_CONTACTS + 1, dynamicTyping: false });
  if (parsed.errors.length) throw new Error("CSV inválido. Confira aspas, separadores e cabeçalhos.");
  if (parsed.data.length > MAX_CONTACTS) throw new Error("Limite de 10.000 linhas.");
  const headers = parsed.meta.fields ?? [];
  if (new Set(headers).size !== headers.length) throw new Error("Cabeçalhos duplicados.");
  const detect = (names: string[]) => headers.find(h => names.includes(label(h))) ?? "";
  return { headers, rows: parsed.data, detected: { name: detect(["nome", "name", "fullname", "nomecompleto"]), phone: detect(["telefone", "phone", "whatsapp", "celular", "mobile"]), email: detect(["email"]) } };
}
export function mapCsv(data: CsvData, mapping: { name: string; phone: string; email?: string }): RawContact[] {
  if (!data.headers.includes(mapping.phone)) throw new Error("Escolha a coluna do telefone.");
  return data.rows.map(row => ({ name: (row[mapping.name] ?? "").slice(0, 120), phones: [row[mapping.phone] ?? ""], email: mapping.email ? row[mapping.email] : undefined }));
}
export function contactPreview(raw: RawContact[], existing: string[], country: CountryCode = "BR"): PreviewContact[] {
  const existingPhones = new Set(existing.map(p => normalizePhone(p, country)).filter(Boolean));
  const seen = new Set<string>();
  const result: PreviewContact[] = [];
  for (const contact of raw) {
    const phones = contact.phones.length ? contact.phones : [""];
    for (const rawPhone of phones) {
      const phone = contact.error ? null : normalizePhone(rawPhone, country);
      const status = !phone ? "invalid" : existingPhones.has(phone) ? "existing" : seen.has(phone) ? "duplicate" : "new";
      if (phone) seen.add(phone);
      result.push({ name: contact.name.trim() || "Cliente", phone, email: contact.email, status, reason: status === "invalid" ? contact.error ?? "Telefone ausente ou inválido. Inclua país e DDD." : undefined, selected: status === "new" });
      if (result.length > MAX_CONTACTS) throw new Error("Limite de 10.000 números por importação.");
    }
  }
  return result;
}
