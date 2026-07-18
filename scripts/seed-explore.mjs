import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { argumentValue, getLocalAdminFirestore } from "./firebase-admin-local.mjs";
import { validateExploreSeed } from "./explore-seed-utils.mjs";

const apply = process.argv.includes("--apply");
const uid = argumentValue("uid");
if (!uid) {
  console.error("Provide the enabled administrator: --uid=<FIREBASE_UID>");
  process.exitCode = 1;
} else {
  try {
    const result = validateExploreSeed();
    const { db } = await getLocalAdminFirestore();
    const admin = await db.collection("admins").doc(uid).get();
    if (!admin.exists || admin.data()?.role !== "admin" || admin.data()?.enabled !== true) throw new Error("The supplied UID is not an enabled administrator.");
    if (!apply) {
      console.log(`Credentialed dry run passed: ${result.records.length} Finds across ${result.stations} stations. No writes performed.`);
    } else {
      const sourceMap = new Map(result.sources.map((item) => [item.findId, item]));
      let writes = 0;
      for (let offset = 0; offset < result.records.length; offset += 150) {
        const batch = db.batch();
        for (const record of result.records.slice(offset, offset + 150)) {
          const publicRef = db.collection("exploreFinds").doc(record.id);
          const current = await publicRef.get();
          if (current.exists && Number(current.data()?.seedVersion ?? 0) >= record.seedVersion) continue;
          const { id, verifiedAt, ...safe } = record;
          batch.set(publicRef, {
            ...safe, schemaVersion:1, status:"published", authorType:"veyro_team",
            authorDisplayName:"Veyro Curated", authorBadge:"Veyro Curated",
            loveCount: current.exists ? Number(current.data()?.loveCount ?? 0) : 0,
            verifiedAt:Timestamp.fromDate(new Date(`${verifiedAt}T00:00:00Z`)),
            createdAt:current.exists ? current.data()?.createdAt : FieldValue.serverTimestamp(),
            updatedAt:FieldValue.serverTimestamp(),
            publishedAt:current.exists ? current.data()?.publishedAt : FieldValue.serverTimestamp(),
          }, { merge:false });
          batch.set(db.collection("exploreFindOwners").doc(id), {
            ownerUid:uid, origin:"seed", createdAt:current.exists ? current.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          }, { merge:true });
          const source = sourceMap.get(id);
          batch.set(db.collection("exploreSourceRecords").doc(id), {
            findId:id, sources:source.sources, locationVerified:source.locationVerified,
            stationProximityVerified:source.stationProximityVerified, walkingTimeVerified:source.walkingTimeVerified,
            verificationNotes:source.notes, researchedAt:FieldValue.serverTimestamp(),
            lastVerifiedAt:Timestamp.fromDate(new Date(`${verifiedAt}T00:00:00Z`)),
          }, { merge:true });
          writes += 3;
        }
        await batch.commit();
      }
      console.log(`Explore seed applied safely: ${result.records.length} checked, ${writes} document writes.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Explore seed failed.");
    process.exitCode = 1;
  }
}
