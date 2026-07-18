import { kochiMetroStations, type KochiMetroStation } from "@/data/kochi-metro-stations";

const clean = (value: string) => value.toLowerCase().normalize("NFKD")
  .replace(/[^a-z0-9\s]/gu, " ").replace(/\s+/gu, " ").trim()
  .replace(/\b0\b/gu, "o").replace(/\b1\b/gu, "i");

export const normalizeStationText = clean;

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

export function matchStationName(value: string): { station: KochiMetroStation; score: number } | null {
  const needle = clean(value);
  if (!needle) return null;
  const matches = kochiMetroStations.flatMap((station) =>
    [station.name, station.shortName ?? "", ...station.aliases]
      .filter(Boolean)
      .map((alias) => {
        const normalized = clean(alias);
        const exact = needle === normalized;
        const contains = needle.length >= 5 && (needle.includes(normalized) || normalized.includes(needle));
        const score = exact ? 1 : contains ? 0.9 : 1 - levenshtein(needle, normalized) / Math.max(needle.length, normalized.length);
        return { station, score };
      }));
  matches.sort((a, b) => b.score - a.score);
  return matches[0] && matches[0].score >= 0.78 ? matches[0] : null;
}

export function validateDetectedRoute(fromText: string, toText: string, confidence: number, threshold = 0.72) {
  const from = matchStationName(fromText);
  const to = matchStationName(toText);
  if (!from || !to || confidence < threshold || from.station.id === to.station.id || from.station.line !== to.station.line) return null;
  return { from: from.station, to: to.station, confidence: Math.min(confidence, from.score, to.score) };
}
