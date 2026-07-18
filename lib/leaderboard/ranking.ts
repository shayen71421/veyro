import { z } from "zod";

export const leaderboardCategories = ["distance", "journeys", "streak"] as const;
export type LeaderboardCategory = typeof leaderboardCategories[number];

export const leaderboardEntryDataSchema = z.object({
  visible: z.boolean(),
  displayName: z.string().trim().min(1).max(30),
  displayNameNormalized: z.string().trim().min(1).max(30),
  photoURL: z.string().url().max(2048).nullable(),
  showPhoto: z.boolean(),
  totalJourneys: z.number().int().min(0).max(100_000),
  totalDistanceKm: z.number().finite().min(0).max(10_000_000),
  longestStreak: z.number().int().min(0).max(10_000),
  statsVersion: z.literal(1),
  joinedAt: z.unknown(),
  updatedAt: z.unknown(),
}).strict().refine((value) => value.showPhoto || value.photoURL === null, {
  message: "A hidden photo must be null.",
});

export type LeaderboardEntryData = z.infer<typeof leaderboardEntryDataSchema>;
export type LeaderboardEntry = Omit<LeaderboardEntryData, "joinedAt" | "updatedAt"> & {
  id: string;
  joinedAt: Date;
  updatedAt: Date;
};

export function timestampToDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "object" || value === null || !("toDate" in value)) return null;
  const toDate = value.toDate;
  if (typeof toDate !== "function") return null;
  const converted = toDate.call(value);
  return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
}

export function parseLeaderboardEntry(id: string, value: unknown): LeaderboardEntry | null {
  const parsed = leaderboardEntryDataSchema.safeParse(value);
  if (!parsed.success) return null;
  const joinedAt = timestampToDate(parsed.data.joinedAt);
  const updatedAt = timestampToDate(parsed.data.updatedAt);
  if (!joinedAt || !updatedAt) return null;
  return { id, ...parsed.data, joinedAt, updatedAt };
}

export function compareLeaderboardEntries(category: LeaderboardCategory, a: LeaderboardEntry, b: LeaderboardEntry): number {
  const joined = a.joinedAt.getTime() - b.joinedAt.getTime();
  const id = a.id.localeCompare(b.id);
  if (category === "distance") {
    return b.totalDistanceKm - a.totalDistanceKm || b.totalJourneys - a.totalJourneys || joined || id;
  }
  if (category === "journeys") {
    return b.totalJourneys - a.totalJourneys || b.totalDistanceKm - a.totalDistanceKm || joined || id;
  }
  return b.longestStreak - a.longestStreak
    || b.totalJourneys - a.totalJourneys
    || b.totalDistanceKm - a.totalDistanceKm
    || joined
    || id;
}

export function getTopFive(entries: readonly LeaderboardEntry[], category: LeaderboardCategory): LeaderboardEntry[] {
  return entries.filter((entry) => entry.visible).sort((a, b) => compareLeaderboardEntries(category, a, b)).slice(0, 5);
}

export function primaryMetric(entry: LeaderboardEntry, category: LeaderboardCategory): number {
  if (category === "distance") return entry.totalDistanceKm;
  if (category === "journeys") return entry.totalJourneys;
  return entry.longestStreak;
}

export function competitionRank(entries: readonly LeaderboardEntry[], current: LeaderboardEntry, category: LeaderboardCategory): number {
  const metric = primaryMetric(current, category);
  return 1 + entries.filter((entry) => entry.visible && primaryMetric(entry, category) > metric).length;
}

export function placeCurrentUser(
  topFive: readonly LeaderboardEntry[],
  currentEntry: LeaderboardEntry | null,
  currentRank: number | null,
) {
  if (!currentEntry?.visible) return { inTopFive: false, currentRow: null };
  const inTopFive = topFive.some((entry) => entry.id === currentEntry.id);
  return {
    inTopFive,
    currentRow: inTopFive || currentRank === null ? null : { entry: currentEntry, rank: currentRank },
  };
}

export function formatLeaderboardMetric(entry: LeaderboardEntry, category: LeaderboardCategory): string {
  if (category === "distance") return `${entry.totalDistanceKm.toFixed(1)} km`;
  if (category === "journeys") return `${entry.totalJourneys} ${entry.totalJourneys === 1 ? "journey" : "journeys"}`;
  return `${entry.longestStreak} ${entry.longestStreak === 1 ? "day" : "days"}`;
}

export function categoryLabel(category: LeaderboardCategory): string {
  if (category === "distance") return "Distance";
  if (category === "journeys") return "Journeys";
  return "Best Streak";
}
