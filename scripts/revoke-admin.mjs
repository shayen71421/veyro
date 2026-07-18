import { FieldValue } from "firebase-admin/firestore";
import { argumentValue, getLocalAdminFirestore } from "./firebase-admin-local.mjs";

const uid = argumentValue("uid");
if (!uid || uid.length > 128) {
  console.error("Usage: npm run admin:revoke -- --uid=<FIREBASE_UID>");
  process.exitCode = 1;
} else {
  try {
    const { db } = await getLocalAdminFirestore();
    await db.collection("admins").doc(uid).set({ role: "admin", enabled: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`Administrator disabled for UID ending …${uid.slice(-6)}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Admin revoke failed.");
    process.exitCode = 1;
  }
}
