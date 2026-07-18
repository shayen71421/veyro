import {
  collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { createFindInputSchema, moderationActionSchema } from "@/lib/explore/schemas";
import { stationById } from "@/data/kochi-metro-stations";
import type { CreateFindInput } from "@/lib/explore/submissions";

export async function isExploreAdmin(uid: string) {
  const client = getFirebaseClient();
  if (!client) return false;
  const snapshot = await getDoc(doc(client.db, "admins", uid));
  return snapshot.exists() && snapshot.data().role === "admin" && snapshot.data().enabled === true;
}

export async function getAdminExploreFinds(status: string) {
  const client = getFirebaseClient();
  if (!client) return [];
  const snapshot = await getDocs(query(collection(client.db, "exploreFinds"), where("status", "==", status), limit(50)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getAdminExploreReports() {
  const client = getFirebaseClient();
  if (!client) return [];
  const snapshot = await getDocs(query(collection(client.db, "exploreReports"), where("status", "in", ["open", "reviewing"]), limit(50)));
  return snapshot.docs.map((item) => ({ id:item.id, ...item.data() }));
}

export async function getAdminSourceRecords() {
  const client = getFirebaseClient();
  if (!client) return [];
  const snapshot = await getDocs(query(collection(client.db, "exploreSourceRecords"), limit(50)));
  return snapshot.docs.map((item) => ({ id:item.id, ...item.data() }));
}

export async function resolveExploreReport(reportId: string, status: "reviewing" | "resolved" | "dismissed") {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  await updateDoc(doc(client.db, "exploreReports", reportId), {
    status, reviewedAt: status === "reviewing" ? null : serverTimestamp(),
  });
}

export async function updateAdminSourceNotes(findId: string, verificationNotes: string) {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const notes = verificationNotes.trim();
  if (notes.length < 5 || notes.length > 1000) throw new Error("INVALID_NOTES");
  await updateDoc(doc(client.db, "exploreSourceRecords", findId), {
    verificationNotes: notes, lastVerifiedAt: serverTimestamp(),
  });
}

export async function createAdminExploreFind(uid: string, input: CreateFindInput, source: { title:string; url:string; sourceType:"official_venue"|"government"|"official_tourism"|"official_transport"|"reliable_secondary"|"maps"; informationUsed:string }) {
  const parsed = createFindInputSchema.parse(input);
  const station = stationById.get(parsed.stationId);
  if (!station?.operational) throw new Error("INVALID_STATION");
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  if (source.title.trim().length < 3 || source.informationUsed.trim().length < 5) throw new Error("INVALID_SOURCE");
  new URL(source.url);
  const id = crypto.randomUUID(); const now = serverTimestamp(); const batch = writeBatch(client.db);
  batch.set(doc(client.db, "exploreFinds", id), {
    schemaVersion:1, status:"published", title:parsed.title, description:parsed.description,
    stationId:station.id, stationName:station.name, category:parsed.category,
    walkingMinutes:parsed.walkingMinutes, walkingTimeType:parsed.walkingTimeType,
    costType:parsed.costType, bestTimes:parsed.bestTimes, environment:parsed.environment,
    latitude:parsed.latitude, longitude:parsed.longitude, accessibilityNote:parsed.accessibilityNote,
    authorType:"veyro_team", authorDisplayName:"Veyro Curated", authorBadge:"Veyro Curated",
    loveCount:0, seedVersion:null, verifiedAt:now, createdAt:now, updatedAt:now, publishedAt:now,
  });
  batch.set(doc(client.db, "exploreFindOwners", id), { ownerUid:uid, origin:"admin", createdAt:now });
  batch.set(doc(client.db, "exploreSourceRecords", id), {
    findId:id, sources:[{ ...source, title:source.title.trim(), informationUsed:source.informationUsed.trim(), accessedAt:new Date().toISOString().slice(0, 10) }],
    locationVerified:true, stationProximityVerified:true, walkingTimeVerified:parsed.walkingTimeType === "verified",
    verificationNotes:"Administrator-created curated Find with recorded source metadata.",
    researchedAt:now, lastVerifiedAt:now,
  });
  await batch.commit();
  return id;
}

export async function moderateExploreFind(input: unknown) {
  const parsed = moderationActionSchema.parse(input);
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const findRef = doc(client.db, "exploreFinds", parsed.findId);
  if (parsed.action === "hide" || parsed.action === "restore" || parsed.action === "remove") {
    await updateDoc(findRef, {
      status: parsed.action === "restore" ? "published" : parsed.action === "hide" ? "hidden" : "removed",
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await runTransaction(client.db, async (transaction) => {
    const ownerRef = doc(client.db, "exploreFindOwners", parsed.findId);
    const [findSnapshot, ownerSnapshot] = await Promise.all([transaction.get(findRef), transaction.get(ownerRef)]);
    if (!findSnapshot.exists() || !ownerSnapshot.exists()) throw new Error("FIND_UNAVAILABLE");
    const ownerUid = ownerSnapshot.data().ownerUid as string;
    const summaryRef = doc(client.db, "users", ownerUid, "exploreSubmissions", parsed.findId);
    const status = parsed.action === "approve" ? "published" : "rejected";
    transaction.update(findRef, {
      status, updatedAt: serverTimestamp(),
      publishedAt: status === "published" ? serverTimestamp() : null,
    });
    transaction.update(summaryRef, {
      status, moderationMessage: status === "rejected" ? parsed.message : null, updatedAt: serverTimestamp(),
    });
  });
}
