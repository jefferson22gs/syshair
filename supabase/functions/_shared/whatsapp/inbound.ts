/** Regras puras do envelope Evolution 2.3.7; nenhum acesso ao banco/modelo. */
export interface IncomingMessage {
  id: string;
  phone: string;
  jid: string;
  text: string;
  name: string;
  quotedMessageId: string | null;
}
export function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function parseIncoming(data: unknown): IncomingMessage | null {
  const row = recordOf(data), key = recordOf(row?.key), message = recordOf(row?.message);
  // Somente inbound inequívoco. Edit/revoke/protocol/status/grupo/LID não resolvido não são comandos.
  if (!row || key?.fromMe !== false || !message || message.protocolMessage || message.editedMessage) return null;
  const jid = key.remoteJid, id = key.id;
  if (typeof jid !== "string" || !/^\d{7,15}@s\.whatsapp\.net$/.test(jid) || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) return null;
  const extended = recordOf(message.extendedTextMessage);
  const text = message.conversation ?? extended?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 8_000) return null;
  const context = recordOf(extended?.contextInfo);
  return { id, jid, phone: `+${jid.split("@")[0]}`, text: text.trim(), name: typeof row.pushName === "string" ? row.pushName.slice(0, 120) : "Cliente", quotedMessageId: typeof context?.stanzaId === "string" ? context.stanzaId : null };
}
export function eventName(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().replaceAll("_", ".") : "";
}
