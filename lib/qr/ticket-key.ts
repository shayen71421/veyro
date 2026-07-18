import { z } from "zod";

const qrSchema = z.string().transform((value) => value.trim()).refine((value) => {
  const bytes = new TextEncoder().encode(value).byteLength;
  return bytes >= 8 && bytes <= 700;
}, "INVALID_QR_LENGTH");

export function normalizeRawQrValue(input: string): string {
  return qrSchema.parse(input);
}

export function createTicketKey(rawQrValue: string): string {
  const bytes = new TextEncoder().encode(rawQrValue);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
