import { parsePhoneNumberFromString } from "npm:libphonenumber-js@1.13.15/min";
import { WhatsAppError } from "./errors.ts";

/** Fronteira de envio: exige formato internacional explícito, nunca adivinha país/DDD. */
export function internationalPhone(value: unknown): string {
  if (typeof value !== "string" || value.length > 40 || !/^\+[1-9][0-9]{6,14}$/.test(value)) throw new WhatsAppError("invalid_request");
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.isValid()) throw new WhatsAppError("invalid_request");
  return parsed.number;
}
export function campaignText(template: string, name: string): string {
  if (template.length > 4096 || /\{\{(?!nome\}\})/.test(template)) throw new WhatsAppError("invalid_request");
  const cleanName = name.replace(/[\r\n{}]/g, " ").trim().split(/\s+/)[0] || "";
  return template.replace(/\{\{nome\}\}|\{nome\}/gi, cleanName).replace(/Olá\s*,\s*!/gi, "Olá!").trim();
}
