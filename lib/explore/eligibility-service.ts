import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { calculateExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";

export const EXPLORE_STATS_VERSION = 1;
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export async function syncExploreEligibility(uid: string, force = false) {
  const client = getFirebaseClient();
  if (!client) return null;
  const reference = doc(client.db, "exploreEligibility", uid);
  if (!force) {
    const current = await getDoc(reference);
    const calculatedAt = current.data()?.calculatedAt?.toDate?.() as Date | undefined;
    if (
      current.exists()
      && current.data().statsVersion === EXPLORE_STATS_VERSION
      && calculatedAt
      && Date.now() - calculatedAt.getTime() < STALE_AFTER_MS
    ) return current.data();
  }
  const eligibility = calculateExplorerEligibility(await getAllJourneys(uid));
  const data = {
    totalJourneys: eligibility.totalJourneys,
    totalDistanceKm: eligibility.totalDistanceKm,
    eligible: eligibility.eligible,
    statsVersion: EXPLORE_STATS_VERSION,
    calculatedAt: serverTimestamp(),
  };
  await setDoc(reference, data);
  return data;
}
