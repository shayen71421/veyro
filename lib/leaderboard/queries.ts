import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import {
  parseLeaderboardEntry,
  primaryMetric,
  type LeaderboardCategory,
  type LeaderboardEntry,
} from "@/lib/leaderboard/ranking";

export type LeaderboardMembership = {
  leaderboardId: string;
  entry: LeaderboardEntry | null;
};

const topFiveCache = new Map<LeaderboardCategory, Promise<LeaderboardEntry[]>>();
const rankCache = new Map<string, Promise<number>>();

const categoryOrder: Record<LeaderboardCategory, QueryConstraint[]> = {
  distance: [
    orderBy("totalDistanceKm", "desc"),
    orderBy("totalJourneys", "desc"),
    orderBy("joinedAt", "asc"),
    orderBy(documentId(), "asc"),
  ],
  journeys: [
    orderBy("totalJourneys", "desc"),
    orderBy("totalDistanceKm", "desc"),
    orderBy("joinedAt", "asc"),
    orderBy(documentId(), "asc"),
  ],
  streak: [
    orderBy("longestStreak", "desc"),
    orderBy("totalJourneys", "desc"),
    orderBy("totalDistanceKm", "desc"),
    orderBy("joinedAt", "asc"),
    orderBy(documentId(), "asc"),
  ],
};

const primaryField: Record<LeaderboardCategory, "totalDistanceKm" | "totalJourneys" | "longestStreak"> = {
  distance: "totalDistanceKm",
  journeys: "totalJourneys",
  streak: "longestStreak",
};

export async function getLeaderboardMembership(uid: string): Promise<LeaderboardMembership | null> {
  const client = getFirebaseClient();
  if (!client) return null;
  const profile = await getDoc(doc(client.db, "users", uid));
  const leaderboardId = profile.exists() ? profile.data().leaderboardId : null;
  if (typeof leaderboardId !== "string" || !leaderboardId) return null;
  const entrySnapshot = await getDoc(doc(client.db, "leaderboardEntries", leaderboardId));
  return {
    leaderboardId,
    entry: entrySnapshot.exists() ? parseLeaderboardEntry(entrySnapshot.id, entrySnapshot.data()) : null,
  };
}

export function getTopFiveLeaderboard(category: LeaderboardCategory, refresh = false): Promise<LeaderboardEntry[]> {
  if (refresh) topFiveCache.delete(category);
  const cached = topFiveCache.get(category);
  if (cached) return cached;
  const request = (async () => {
    const client = getFirebaseClient();
    if (!client) return [];
    const snapshot = await getDocs(query(
      collection(client.db, "leaderboardEntries"),
      where("visible", "==", true),
      ...categoryOrder[category],
      limit(5),
    ));
    return snapshot.docs.flatMap((item) => {
      const entry = parseLeaderboardEntry(item.id, item.data());
      return entry ? [entry] : [];
    });
  })().catch((error: unknown) => {
    topFiveCache.delete(category);
    throw error;
  });
  topFiveCache.set(category, request);
  return request;
}

export function getCompetitionRank(entry: LeaderboardEntry, category: LeaderboardCategory, refresh = false): Promise<number> {
  const cacheKey = `${entry.id}:${category}:${primaryMetric(entry, category)}`;
  if (refresh) rankCache.delete(cacheKey);
  const cached = rankCache.get(cacheKey);
  if (cached) return cached;
  const request = (async () => {
    const client = getFirebaseClient();
    if (!client) return 0;
    const result = await getCountFromServer(query(
      collection(client.db, "leaderboardEntries"),
      where("visible", "==", true),
      where(primaryField[category], ">", primaryMetric(entry, category)),
    ));
    return result.data().count + 1;
  })().catch((error: unknown) => {
    rankCache.delete(cacheKey);
    throw error;
  });
  rankCache.set(cacheKey, request);
  return request;
}

export function clearLeaderboardCache(category?: LeaderboardCategory) {
  if (category) topFiveCache.delete(category);
  else topFiveCache.clear();
  rankCache.clear();
}

export function leaderboardErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (code === "failed-precondition") {
    return "The leaderboard indexes have not been deployed yet. Deploy the Firestore indexes, then refresh.";
  }
  if (code === "permission-denied") {
    return "The leaderboard security rules have not been deployed yet. Deploy the Firestore rules, then refresh.";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You need an internet connection to load community rankings.";
  }
  return "We could not load the community rankings. Check your connection and try again.";
}
