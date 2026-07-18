import {
  collection, documentId, getDoc, getDocs, limit, orderBy, query, where, doc,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { exploreFindDataSchema } from "@/lib/explore/schemas";
import type { ExploreFind, ExploreInteraction } from "@/lib/explore/types";
import { mergeExploreCandidates } from "@/lib/explore/get-explore-candidates";

const sessionCache = new Map<string, Promise<ExploreFind[]>>();

function parseFind(id: string, data: unknown): ExploreFind | null {
  const parsed = exploreFindDataSchema.safeParse(data);
  return parsed.success ? { id, ...parsed.data } as ExploreFind : null;
}

async function runFindQuery(constraints: QueryConstraint[]) {
  const client = getFirebaseClient();
  if (!client) return [];
  const snapshot = await getDocs(query(collection(client.db, "exploreFinds"), ...constraints));
  return snapshot.docs.map((item) => parseFind(item.id, item.data())).filter((item): item is ExploreFind => item !== null);
}

export async function getPublishedFind(id: string) {
  const client = getFirebaseClient();
  if (!client) return null;
  const snapshot = await getDoc(doc(client.db, "exploreFinds", id));
  if (!snapshot.exists()) return null;
  const result = parseFind(snapshot.id, snapshot.data());
  return result?.status === "published" ? result : null;
}

export function getExploreCandidates(relevantStationIds: string[] = [], refresh = false): Promise<ExploreFind[]> {
  const stationIds = [...new Set(relevantStationIds)].slice(0, 5).sort();
  const key = stationIds.join("|") || "cold";
  if (refresh) sessionCache.delete(key);
  const cached = sessionCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    const results = await Promise.allSettled([
      stationIds.length
        ? runFindQuery([where("status", "==", "published"), where("stationId", "in", stationIds), orderBy("loveCount", "desc"), limit(20)])
        : Promise.resolve([]),
      runFindQuery([where("status", "==", "published"), orderBy("loveCount", "desc"), limit(15)]),
      runFindQuery([where("status", "==", "published"), orderBy("publishedAt", "desc"), limit(15)]),
      runFindQuery([where("status", "==", "published"), where("authorType", "==", "veyro_team"), orderBy("publishedAt", "desc"), limit(15)]),
    ]);
    const pools = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!pools.length) throw new Error("EXPLORE_QUERIES_FAILED");
    return mergeExploreCandidates(...pools);
  })().catch((error: unknown) => {
    sessionCache.delete(key);
    throw error;
  });
  sessionCache.set(key, request);
  return request;
}

export async function getInteractions(uid: string): Promise<Map<string, ExploreInteraction>> {
  const client = getFirebaseClient();
  if (!client) return new Map();
  const snapshot = await getDocs(query(collection(client.db, "users", uid, "exploreInteractions"), limit(100)));
  return new Map(snapshot.docs.map((item) => [item.id, item.data() as ExploreInteraction]));
}

export async function getFindsByIds(ids: string[]): Promise<ExploreFind[]> {
  const client = getFirebaseClient();
  if (!client || !ids.length) return [];
  const chunks = Array.from({ length: Math.ceil(ids.length / 30) }, (_, index) => ids.slice(index * 30, index * 30 + 30));
  const snapshots = await Promise.all(chunks.map((chunk) =>
    getDocs(query(collection(client.db, "exploreFinds"), where("status", "==", "published"), where(documentId(), "in", chunk), limit(30)))));
  return snapshots.flatMap((snapshot) => snapshot.docs)
    .map((item) => parseFind(item.id, item.data()))
    .filter((item): item is ExploreFind => item !== null);
}

export function getFindsNearStation(stationId: string, count = 3) {
  return runFindQuery([where("status", "==", "published"), where("stationId", "==", stationId), orderBy("loveCount", "desc"), limit(count)]);
}

export function getHomeExploreFinds(stationIds: string[]) {
  const relevant = [...new Set(stationIds)].slice(0, 5);
  return relevant.length
    ? runFindQuery([where("status", "==", "published"), where("stationId", "in", relevant), orderBy("loveCount", "desc"), limit(3)])
    : runFindQuery([where("status", "==", "published"), where("authorType", "==", "veyro_team"), orderBy("publishedAt", "desc"), limit(3)]);
}

export function clearExploreSessionCache() {
  sessionCache.clear();
}
