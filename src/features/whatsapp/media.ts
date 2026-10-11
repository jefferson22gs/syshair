export const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "application/pdf": "pdf",
};
export async function validateMedia(file: File): Promise<void> {
  const mime = file.type;
  if (!MIME_EXTENSIONS[mime]) throw new Error("Use JPG, PNG, WebP, MP4 ou PDF.");
  const limit = mime.startsWith("image/") ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
  if (!file.size || file.size > limit) throw new Error(mime.startsWith("image/") ? "Imagem até 5 MB." : "Vídeo/documento até 16 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  const valid = mime === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : mime === "image/png" ? bytes[0] === 0x89 && text(1, 4) === "PNG"
    : mime === "image/webp" ? text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
    : mime === "video/mp4" ? text(4, 8) === "ftyp"
    : text(0, 5) === "%PDF-";
  if (!valid) throw new Error("O conteúdo do arquivo não corresponde ao formato informado.");
}
