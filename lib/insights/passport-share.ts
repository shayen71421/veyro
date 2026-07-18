import { z } from "zod";
import type { JourneyInsights } from "@/lib/insights/journey-insights";

export const passportShareSchema = z.object({
  v: z.literal(1),
  displayName: z.string().trim().min(1).max(40),
  totalJourneys: z.number().int().min(0).max(100_000),
  totalDistanceKm: z.number().finite().min(0).max(10_000_000),
  uniqueStationsVisited: z.number().int().min(0).max(100),
  networkCoveragePercent: z.number().int().min(0).max(100),
  streak: z.number().int().min(0).max(10_000),
  mostVisitedStation: z.string().trim().min(1).max(80).nullable(),
  generatedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PassportSharePayload = z.infer<typeof passportShareSchema>;

export function createPassportSharePayload(
  displayName: string,
  insights: JourneyInsights,
  generatedOn: string,
): PassportSharePayload {
  return passportShareSchema.parse({
    v: 1,
    displayName,
    totalJourneys: insights.totalJourneys,
    totalDistanceKm: insights.totalDistanceKm,
    uniqueStationsVisited: insights.uniqueStationsVisited,
    networkCoveragePercent: insights.networkCoveragePercent,
    streak: insights.currentStreak || insights.longestStreak,
    mostVisitedStation: insights.mostVisitedStation?.station.name ?? null,
    generatedOn,
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("INVALID_PASSPORT_LINK");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodePassportSharePayload(payload: PassportSharePayload): string {
  const validated = passportShareSchema.parse(payload);
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(validated)));
}

export function decodePassportSharePayload(value: string): PassportSharePayload | null {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(value));
    return passportShareSchema.parse(JSON.parse(decoded) as unknown);
  } catch {
    return null;
  }
}
