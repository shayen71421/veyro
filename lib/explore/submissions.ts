import {
  collection, doc, getDocs, query, serverTimestamp, writeBatch, limit, updateDoc,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { stationById } from "@/data/kochi-metro-stations";
import { createFindInputSchema } from "@/lib/explore/schemas";
import type { z } from "zod";

export type CreateFindInput = z.infer<typeof createFindInputSchema>;

export async function submitExploreFind(uid: string, displayName: string, input: CreateFindInput) {
  const parsed = createFindInputSchema.parse(input);
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const station = stationById.get(parsed.stationId);
  if (!station?.operational) throw new Error("INVALID_STATION");
  const findId = crypto.randomUUID();
  const batch = writeBatch(client.db);
  const now = serverTimestamp();
  const publicData = {
    schemaVersion: 1, status: "pending", title: parsed.title, description: parsed.description,
    stationId: station.id, stationName: station.name, category: parsed.category,
    walkingMinutes: parsed.walkingMinutes, walkingTimeType: parsed.walkingTimeType,
    costType: parsed.costType, bestTimes: parsed.bestTimes, environment: parsed.environment,
    latitude: parsed.latitude, longitude: parsed.longitude, accessibilityNote: parsed.accessibilityNote,
    authorType: "local_explorer", authorDisplayName: displayName.slice(0, 30),
    authorBadge: "Local Explorer", loveCount: 0, seedVersion: null, verifiedAt: null,
    createdAt: now, updatedAt: now, publishedAt: null,
  };
  batch.set(doc(client.db, "exploreFinds", findId), publicData);
  batch.set(doc(client.db, "exploreFindOwners", findId), { ownerUid: uid, origin: "community", createdAt: now });
  batch.set(doc(client.db, "users", uid, "exploreSubmissions", findId), {
    findId, title: parsed.title, stationId: station.id, stationName: station.name,
    status: "pending", moderationMessage: null, createdAt: now, updatedAt: now,
  });
  await batch.commit();
  return findId;
}

export async function getMyExploreSubmissions(uid: string) {
  const client = getFirebaseClient();
  if (!client) return [];
  const snapshot = await getDocs(query(collection(client.db, "users", uid, "exploreSubmissions"), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function withdrawExploreSubmission(uid: string, findId: string) {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  await updateDoc(doc(client.db, "exploreFinds", findId), { status: "removed", updatedAt: serverTimestamp() });
  await updateDoc(doc(client.db, "users", uid, "exploreSubmissions", findId), { status: "removed", updatedAt: serverTimestamp() });
}

export async function reviseExploreSubmission(uid: string, findId: string, title: string, description: string) {
  const parsedTitle = createFindInputSchema.shape.title.parse(title);
  const parsedDescription = createFindInputSchema.shape.description.parse(description);
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const batch = writeBatch(client.db);
  batch.update(doc(client.db, "exploreFinds", findId), {
    title: parsedTitle, description: parsedDescription, status: "pending", updatedAt: serverTimestamp(),
  });
  batch.update(doc(client.db, "users", uid, "exploreSubmissions", findId), {
    title: parsedTitle, status: "pending", moderationMessage: null, updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
