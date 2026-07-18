import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, Timestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";

let environment: RulesTestEnvironment;
const projectId = "veyro-rules-test";
const key = "VkVZUk8tVEVTVC0wMDE";
const leaderboardId = "11111111-1111-4111-8111-111111111111";

const journey = (ownerUid: string, ticketReference = key) => ({ ownerUid, fromStationId: "aluva", fromStationName: "Aluva", toStationId: "pulinchodu", toStationName: "Pulinchodu", stationIntervals: 1, distanceKm: 1.7, scannedAt: serverTimestamp(), ocrConfidence: .91, ticketReference, createdAt: serverTimestamp() });

async function atomicCreate(uid: string, ticketKey = key, journeyId = "journey-1") {
  const db = environment.authenticatedContext(uid).firestore(); const batch = writeBatch(db);
  batch.set(doc(db, "ticketClaims", ticketKey), { claimed: true, createdAt: serverTimestamp() });
  batch.set(doc(db, "privateTicketPayloads", ticketKey), { rawQrValue: "VEYRO-TEST-001", ownerUid: uid, journeyId, fromStationId: "aluva", toStationId: "pulinchodu", scannedAt: serverTimestamp() });
  batch.set(doc(db, "journeys", journeyId), journey(uid, ticketKey));
  return batch.commit();
}

const leaderboardEntry = (visible = true) => ({
  visible,
  displayName: "Alice Rider",
  displayNameNormalized: "alice rider",
  photoURL: null,
  showPhoto: false,
  totalJourneys: 4,
  totalDistanceKm: 12.4,
  longestStreak: 2,
  statsVersion: 1,
  joinedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

async function seedUser(uid: string) {
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "users", uid), {
    uid,
    displayName: "Alice Rider",
    email: "private@example.test",
    photoURL: null,
    createdAt: Timestamp.now(),
    lastSeenAt: Timestamp.now(),
  }));
}

async function joinLeaderboard(uid: string, id = leaderboardId) {
  await seedUser(uid);
  const db = environment.authenticatedContext(uid).firestore();
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), { leaderboardId: id, lastSeenAt: serverTimestamp() });
  batch.set(doc(db, "leaderboardOwners", id), { ownerUid: uid, createdAt: serverTimestamp() });
  batch.set(doc(db, "leaderboardEntries", id), leaderboardEntry());
  return batch.commit();
}

beforeAll(async () => { environment = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } }); });
afterEach(async () => environment.clearFirestore()); afterAll(async () => environment.cleanup());

describe("Veyro Firestore rules", () => {
  it("rejects unauthenticated protected access", async () => { await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "journeys", "x"))); });
  it("rejects reading another user's journey", async () => { await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "journeys", "owned"), { ...journey("alice"), scannedAt: Timestamp.now(), createdAt: Timestamp.now() })); await assertFails(getDoc(doc(environment.authenticatedContext("bob").firestore(), "journeys", "owned"))); });
  it("rejects a duplicate ticket claim", async () => { await assertSucceeds(atomicCreate("alice")); await assertFails(atomicCreate("alice", key, "journey-2")); });
  it("rejects listing ticket claims", async () => { await assertSucceeds(atomicCreate("alice")); await assertFails(getDocs(collection(environment.authenticatedContext("alice").firestore(), "ticketClaims"))); });
  it("rejects reading private raw QR payloads", async () => { await assertSucceeds(atomicCreate("alice")); await assertFails(getDoc(doc(environment.authenticatedContext("alice").firestore(), "privateTicketPayloads", key))); });
  it("rejects updating an existing journey", async () => { await assertSucceeds(atomicCreate("alice")); await assertFails(updateDoc(doc(environment.authenticatedContext("alice").firestore(), "journeys", "journey-1"), { distanceKm: 99 })); });
  it("allows a valid atomic claim, payload, and journey creation", async () => { await assertSucceeds(atomicCreate("alice")); const db = environment.authenticatedContext("alice").firestore(); await expect(assertSucceeds(getDoc(doc(db, "journeys", "journey-1")))).resolves.toBeDefined(); await assertSucceeds(getDocs(query(collection(db, "journeys"), where("ownerUid", "==", "alice")))); });
  it("allows an atomic private ownership mapping and safe public entry", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    const db = environment.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "leaderboardOwners", leaderboardId)));
    await assertSucceeds(getDoc(doc(db, "leaderboardEntries", leaderboardId)));
  });
  it("prevents another user from updating a leaderboard entry", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    const entry = doc(environment.authenticatedContext("bob").firestore(), "leaderboardEntries", leaderboardId);
    await assertFails(updateDoc(entry, { displayName: "Bob", displayNameNormalized: "bob", updatedAt: serverTimestamp() }));
  });
  it("prevents listing leaderboard ownership records", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    await assertFails(getDocs(collection(environment.authenticatedContext("alice").firestore(), "leaderboardOwners")));
    await assertFails(getDoc(doc(environment.authenticatedContext("bob").firestore(), "leaderboardOwners", leaderboardId)));
  });
  it("publicly exposes only opted-in visible leaderboard entries", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    const publicDb = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(publicDb, "leaderboardEntries", leaderboardId)));
    const visible = await assertSucceeds(getDocs(query(collection(publicDb, "leaderboardEntries"), where("visible", "==", true))));
    expect(visible.size).toBe(1);
  });
  it("keeps hidden leaderboard entries private from public reads", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    await assertSucceeds(updateDoc(doc(environment.authenticatedContext("alice").firestore(), "leaderboardEntries", leaderboardId), { visible: false, updatedAt: serverTimestamp() }));
    const publicDb = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(publicDb, "leaderboardEntries", leaderboardId)));
    const visible = await assertSucceeds(getDocs(query(collection(publicDb, "leaderboardEntries"), where("visible", "==", true))));
    expect(visible.empty).toBe(true);
    const bobDb = environment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bobDb, "leaderboardEntries", leaderboardId)));
  });
  it("rejects unknown public leaderboard fields", async () => {
    await assertSucceeds(joinLeaderboard("alice"));
    const entry = doc(environment.authenticatedContext("alice").firestore(), "leaderboardEntries", leaderboardId);
    await assertFails(updateDoc(entry, { email: "leak@example.test", updatedAt: serverTimestamp() }));
  });

});
