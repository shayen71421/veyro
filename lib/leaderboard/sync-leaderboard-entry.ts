import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { publicDisplayNameSchema } from "@/lib/validation/schemas";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { calculateLeaderboardStats } from "@/lib/leaderboard/calculate-leaderboard-stats";
import { clearLeaderboardCache, getLeaderboardMembership } from "@/lib/leaderboard/queries";
import { leaderboardEntryDataSchema, type LeaderboardEntry } from "@/lib/leaderboard/ranking";
import type { Journey } from "@/types";

const normalizedName = (name: string) => name.trim().toLocaleLowerCase("en-US");

export function createSafeLeaderboardSummary(input: {
  displayName: string;
  photoURL: string | null;
  showPhoto: boolean;
  journeys: readonly Journey[];
}) {
  const displayName = publicDisplayNameSchema.parse(input.displayName);
  const stats = calculateLeaderboardStats(input.journeys);
  return {
    visible: true,
    displayName,
    displayNameNormalized: normalizedName(displayName),
    photoURL: input.showPhoto ? input.photoURL : null,
    showPhoto: input.showPhoto,
    ...stats,
    statsVersion: 1 as const,
  };
}

export async function joinLeaderboard(input: {
  uid: string;
  displayName: string;
  photoURL: string | null;
  journeys: readonly Journey[];
}): Promise<string> {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const candidateId = crypto.randomUUID();
  const data = createSafeLeaderboardSummary({ ...input, showPhoto: false });
  const leaderboardId = await runTransaction(client.db, async (transaction) => {
    const userRef = doc(client.db, "users", input.uid);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error("PROFILE_NOT_FOUND");
    const existingId = userSnapshot.data().leaderboardId;
    if (typeof existingId !== "string" || !existingId) {
      const ownerRef = doc(client.db, "leaderboardOwners", candidateId);
      const entryRef = doc(client.db, "leaderboardEntries", candidateId);
      transaction.update(userRef, { leaderboardId: candidateId, lastSeenAt: serverTimestamp() });
      transaction.set(ownerRef, { ownerUid: input.uid, createdAt: serverTimestamp() });
      transaction.set(entryRef, { ...data, joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return candidateId;
    }

    const id = existingId;
    const ownerRef = doc(client.db, "leaderboardOwners", id);
    const entryRef = doc(client.db, "leaderboardEntries", id);
    const [ownerSnapshot, entrySnapshot] = await Promise.all([transaction.get(ownerRef), transaction.get(entryRef)]);
    if (ownerSnapshot.exists() && ownerSnapshot.data().ownerUid !== input.uid) throw new Error("OWNERSHIP_MISMATCH");
    if (!ownerSnapshot.exists()) transaction.set(ownerRef, { ownerUid: input.uid, createdAt: serverTimestamp() });
    if (entrySnapshot.exists()) {
      transaction.update(entryRef, { ...data, showPhoto: entrySnapshot.data().showPhoto === true, photoURL: entrySnapshot.data().showPhoto === true ? input.photoURL : null, joinedAt: entrySnapshot.data().joinedAt, updatedAt: serverTimestamp() });
    } else {
      transaction.set(entryRef, { ...data, joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    return id;
  });
  clearLeaderboardCache();
  return leaderboardId;
}

export async function leaveLeaderboard(uid: string): Promise<void> {
  const client = getFirebaseClient();
  const membership = await getLeaderboardMembership(uid);
  if (!client || !membership?.entry) return;
  await updateDoc(doc(client.db, "leaderboardEntries", membership.leaderboardId), {
    visible: false,
    updatedAt: serverTimestamp(),
  });
  clearLeaderboardCache();
}

export async function setLeaderboardPhotoVisibility(uid: string, authPhotoURL: string | null, showPhoto: boolean): Promise<void> {
  const client = getFirebaseClient();
  const membership = await getLeaderboardMembership(uid);
  if (!client || !membership?.entry) throw new Error("NOT_JOINED");
  await updateDoc(doc(client.db, "leaderboardEntries", membership.leaderboardId), {
    showPhoto,
    photoURL: showPhoto ? authPhotoURL : null,
    updatedAt: serverTimestamp(),
  });
  clearLeaderboardCache();
}

export async function syncLeaderboardIdentity(uid: string, displayName: string, authPhotoURL: string | null): Promise<void> {
  const client = getFirebaseClient();
  const membership = await getLeaderboardMembership(uid);
  if (!client || !membership?.entry) return;
  const safeName = publicDisplayNameSchema.parse(displayName);
  await updateDoc(doc(client.db, "leaderboardEntries", membership.leaderboardId), {
    displayName: safeName,
    displayNameNormalized: normalizedName(safeName),
    photoURL: membership.entry.showPhoto ? authPhotoURL : null,
    updatedAt: serverTimestamp(),
  });
  clearLeaderboardCache();
}

export async function syncLeaderboardEntryForUser(uid: string, suppliedJourneys?: readonly Journey[]): Promise<LeaderboardEntry | null> {
  const client = getFirebaseClient();
  if (!client) return null;
  const membership = await getLeaderboardMembership(uid);
  if (!membership?.entry?.visible) return membership?.entry ?? null;
  const profile = await getDoc(doc(client.db, "users", uid));
  if (!profile.exists()) return membership.entry;
  const journeys = suppliedJourneys ?? await getAllJourneys(uid);
  const desired = createSafeLeaderboardSummary({
    displayName: String(profile.data().displayName ?? "Veyro rider"),
    photoURL: typeof profile.data().photoURL === "string" ? profile.data().photoURL : null,
    showPhoto: membership.entry.showPhoto,
    journeys,
  });
  const current = membership.entry;
  const stale = current.statsVersion !== 1
    || current.displayName !== desired.displayName
    || current.photoURL !== desired.photoURL
    || current.totalJourneys !== desired.totalJourneys
    || current.totalDistanceKm !== desired.totalDistanceKm
    || current.longestStreak !== desired.longestStreak;
  if (!stale) return current;
  const update = { ...desired, updatedAt: serverTimestamp() };
  const validation = leaderboardEntryDataSchema.safeParse({
    ...desired,
    joinedAt: current.joinedAt,
    updatedAt: new Date(),
  });
  if (!validation.success) throw new Error("INVALID_LEADERBOARD_ENTRY");
  await updateDoc(doc(client.db, "leaderboardEntries", membership.leaderboardId), update);
  clearLeaderboardCache();
  return { ...current, ...desired, updatedAt: new Date() };
}
