import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { reportInputSchema } from "@/lib/explore/schemas";

export async function reportExploreFind(uid: string, input: unknown) {
  const parsed = reportInputSchema.parse(input);
  const client = getFirebaseClient();
  if (!client) throw new Error("FIREBASE_NOT_CONFIGURED");
  const reportId = `${parsed.findId}__${uid}`;
  await setDoc(doc(client.db, "exploreReports", reportId), {
    ...parsed, reporterUid: uid, status: "open", createdAt: serverTimestamp(), reviewedAt: null,
  });
}
