import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import type { ExploreReaction } from "@/lib/explore/types";

const blankInteraction = (findId: string) => ({
  findId, saved: false, visited: false, hidden: false, reaction: null,
  firstSeenAt: serverTimestamp(), savedAt: null, visitedAt: null, reactionAt: null,
  hiddenAt: null, updatedAt: serverTimestamp(),
});

export async function updateExploreInteraction(
  uid: string,
  findId: string,
  change: "save" | "visit" | "hide",
  value: boolean,
) {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const reference = doc(client.db, "users", uid, "exploreInteractions", findId);
  const snapshot = await getDoc(reference);
  const current = snapshot.exists() ? snapshot.data() : blankInteraction(findId);
  if (change === "visit" && !value && current.reaction === "loved") {
    await setExploreReaction(uid, findId, null);
  }
  const next = {
    ...current,
    findId,
    ...(change === "save" ? { saved: value, savedAt: value ? serverTimestamp() : null } : {}),
    ...(change === "visit" ? {
      visited: value, visitedAt: value ? serverTimestamp() : null,
      ...(!value ? { reaction: null, reactionAt: null } : {}),
    } : {}),
    ...(change === "hide" ? { hidden: value, hiddenAt: value ? serverTimestamp() : null } : {}),
    updatedAt: serverTimestamp(),
  };
  await setDoc(reference, next);
}

function loveDelta(before: ExploreReaction, after: ExploreReaction) {
  return (after === "loved" ? 1 : 0) - (before === "loved" ? 1 : 0);
}

export async function setExploreReaction(uid: string, findId: string, reaction: ExploreReaction) {
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const interactionRef = doc(client.db, "users", uid, "exploreInteractions", findId);
  const findRef = doc(client.db, "exploreFinds", findId);
  await runTransaction(client.db, async (transaction) => {
    const [interactionSnapshot, findSnapshot] = await Promise.all([
      transaction.get(interactionRef), transaction.get(findRef),
    ]);
    if (!interactionSnapshot.exists() || interactionSnapshot.data().visited !== true) throw new Error("VISIT_REQUIRED");
    if (!findSnapshot.exists() || findSnapshot.data().status !== "published") throw new Error("FIND_UNAVAILABLE");
    const before = (interactionSnapshot.data().reaction ?? null) as ExploreReaction;
    const delta = loveDelta(before, reaction);
    const loveCount = Math.max(0, Number(findSnapshot.data().loveCount ?? 0) + delta);
    transaction.update(interactionRef, { reaction, reactionAt: reaction ? serverTimestamp() : null, updatedAt: serverTimestamp() });
    if (delta) transaction.update(findRef, { loveCount, updatedAt: serverTimestamp() });
  });
}

export { loveDelta };
