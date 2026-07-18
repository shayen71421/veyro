import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch, Timestamp } from "firebase/firestore";
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

const publicFind = (status = "published") => ({
  schemaVersion:1, status, title:"Riverfront Walk", description:"A real public place with a sufficiently detailed plain-text description.",
  stationId:"aluva", stationName:"Aluva", category:"park", walkingMinutes:10, walkingTimeType:"estimated",
  costType:"free", bestTimes:["morning"], environment:"outdoor", latitude:10.11, longitude:76.35,
  accessibilityNote:null, authorType:"local_explorer", authorDisplayName:"Alice Rider", authorBadge:"Local Explorer",
  loveCount:0, seedVersion:null, verifiedAt:null, createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
  publishedAt:status === "published" ? serverTimestamp() : null,
});

async function seedPublishedFind(id = "riverfront") {
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "exploreFinds", id), {
    ...publicFind(), createdAt:Timestamp.now(), updatedAt:Timestamp.now(), publishedAt:Timestamp.now(),
  }));
}

async function seedEligibility(uid: string, eligible: boolean) {
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "exploreEligibility", uid), {
    totalJourneys:eligible ? 5 : 2, totalDistanceKm:eligible ? 25 : 8, eligible, statsVersion:1, calculatedAt:Timestamp.now(),
  }));
}

async function submitFind(uid: string, id = "community-find") {
  const db = environment.authenticatedContext(uid).firestore(); const batch = writeBatch(db);
  batch.set(doc(db, "exploreFinds", id), publicFind("pending"));
  batch.set(doc(db, "exploreFindOwners", id), { ownerUid:uid, origin:"community", createdAt:serverTimestamp() });
  batch.set(doc(db, "users", uid, "exploreSubmissions", id), {
    findId:id, title:"Riverfront Walk", stationId:"aluva", stationName:"Aluva", status:"pending",
    moderationMessage:null, createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
  });
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

  it("rejects unauthenticated Explore reads and allows signed-in published reads", async () => {
    await seedPublishedFind();
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "exploreFinds", "riverfront")));
    const db = environment.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "exploreFinds", "riverfront")));
    await assertSucceeds(getDocs(query(collection(db, "exploreFinds"), where("status", "==", "published"))));
  });
  it("excludes pending Finds from normal readers", async () => {
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "exploreFinds", "pending"), {
      ...publicFind("pending"), createdAt:Timestamp.now(), updatedAt:Timestamp.now(),
    }));
    await assertFails(getDoc(doc(environment.authenticatedContext("bob").firestore(), "exploreFinds", "pending")));
  });
  it("requires eligible atomic pending submissions", async () => {
    await seedEligibility("alice", false);
    await assertFails(submitFind("alice", "not-eligible"));
    await seedEligibility("alice", true);
    await assertSucceeds(submitFind("alice"));
  });
  it("prevents normal publishing and editing another owner's Find", async () => {
    await seedEligibility("alice", true); await assertSucceeds(submitFind("alice"));
    await assertFails(updateDoc(doc(environment.authenticatedContext("alice").firestore(), "exploreFinds", "community-find"), { status:"published", publishedAt:serverTimestamp(), updatedAt:serverTimestamp() }));
    await assertFails(updateDoc(doc(environment.authenticatedContext("bob").firestore(), "exploreFinds", "community-find"), { title:"Taken over", updatedAt:serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(environment.authenticatedContext("alice").firestore(), "exploreFinds", "community-find"), { title:"Updated Riverfront Walk", updatedAt:serverTimestamp() }));
  });
  it("returns an owner-edited published Find to pending", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "exploreFinds", "owned-published"), { ...publicFind(), createdAt:Timestamp.now(), updatedAt:Timestamp.now(), publishedAt:Timestamp.now() });
      await setDoc(doc(context.firestore(), "exploreFindOwners", "owned-published"), { ownerUid:"alice", origin:"community", createdAt:Timestamp.now() });
    });
    await assertSucceeds(updateDoc(doc(environment.authenticatedContext("alice").firestore(), "exploreFinds", "owned-published"), { status:"pending", title:"Revised Riverfront Walk", updatedAt:serverTimestamp() }));
  });
  it("allows an enabled admin to approve and rejects non-admin admin-data access", async () => {
    await seedEligibility("alice", true); await assertSucceeds(submitFind("alice"));
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "admins", "admin"), { role:"admin", enabled:true, createdAt:Timestamp.now(), updatedAt:null }));
    const adminDb = environment.authenticatedContext("admin").firestore();
    await assertSucceeds(updateDoc(doc(adminDb, "exploreFinds", "community-find"), { status:"published", publishedAt:serverTimestamp(), updatedAt:serverTimestamp() }));
    await assertFails(getDocs(collection(environment.authenticatedContext("alice").firestore(), "admins")));
    await assertFails(getDoc(doc(environment.authenticatedContext("alice").firestore(), "exploreSourceRecords", "community-find")));
  });
  it("keeps reports private and prevents public listing", async () => {
    await seedPublishedFind();
    const aliceDb = environment.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "exploreReports", "riverfront__alice"), {
      findId:"riverfront", reporterUid:"alice", reason:"incorrect_location", details:null,
      status:"open", createdAt:serverTimestamp(), reviewedAt:null,
    }));
    await assertFails(getDocs(collection(aliceDb, "exploreReports")));
  });
  it("allows only own interactions and couples loved reactions to loveCount", async () => {
    await seedPublishedFind();
    const aliceDb = environment.authenticatedContext("alice").firestore();
    const interactionRef = doc(aliceDb, "users", "alice", "exploreInteractions", "riverfront");
    await assertSucceeds(setDoc(interactionRef, {
      findId:"riverfront", saved:false, visited:true, hidden:false, reaction:null,
      firstSeenAt:serverTimestamp(), savedAt:null, visitedAt:serverTimestamp(), reactionAt:null, hiddenAt:null, updatedAt:serverTimestamp(),
    }));
    await assertFails(getDoc(doc(environment.authenticatedContext("bob").firestore(), "users", "alice", "exploreInteractions", "riverfront")));
    await assertSucceeds(runTransaction(aliceDb, async (transaction) => {
      const findRef = doc(aliceDb, "exploreFinds", "riverfront");
      await transaction.get(interactionRef); const find = await transaction.get(findRef);
      transaction.update(interactionRef, { reaction:"loved", reactionAt:serverTimestamp(), updatedAt:serverTimestamp() });
      transaction.update(findRef, { loveCount:Number(find.data()?.loveCount ?? 0) + 1, updatedAt:serverTimestamp() });
    }));
    await assertFails(updateDoc(doc(aliceDb, "exploreFinds", "riverfront"), { loveCount:99, updatedAt:serverTimestamp() }));
  });
});
