import { FieldValue } from "firebase-admin/firestore";
import { argumentValue, getLocalAdminFirestore } from "./firebase-admin-local.mjs";

const uid = argumentValue("uid");
if (!uid || uid.length > 128) {
  console.error("Usage: npm run admin:grant -- --uid=<FIREBASE_UID>");
  process.exitCode = 1;
} else {
  try {
    const { db } = await getLocalAdminFirestore();
    const reference = db.collection("admins").doc(uid);
    const existing = await reference.get();
    await reference.set(existing.exists
      ? { role: "admin", enabled: true, updatedAt: FieldValue.serverTimestamp() }
      : { role: "admin", enabled: true, createdAt: FieldValue.serverTimestamp(), updatedAt: null },
    { merge: true });
    console.log(`Administrator enabled for UID ending …${uid.slice(-6)}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Admin grant failed.");
    process.exitCode = 1;
  }
}
