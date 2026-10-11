import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export function normalizePhone(raw: string, country: CountryCode = "BR"): string | null {
  if (raw.length > 100) return null;
  let text = raw.trim().replace(/^tel:/i, "");
  if (text.includes("@")) {
    if (!/^\d{7,15}@s\.whatsapp\.net$/.test(text)) return null;
    text = `+${text.split("@")[0]}`;
  }
  text = text.replace(/;ext=\d+$/i, "");
  if (/[A-Za-z]/.test(text)) return null;
  if (text.startsWith("00")) text = "+" + text.slice(2);
  const digits = text.replace(/\D/g, "");
  // DDI explícito sem '+' em import brasileiro, não acrescenta 55 em internacional.
  if (!text.startsWith("+") && country === "BR") {
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) text = `+${digits}`;
    else if (digits.length !== 10 && digits.length !== 11) return null; // Sem DDD não adivinhar.
  }
  const phone = parsePhoneNumberFromString(text, country);
  if (!phone?.isValid() || phone.ext) return null;
  return phone.number;
}
