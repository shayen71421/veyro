import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const firebaseToolsRoot = dirname(require.resolve("firebase-tools/package.json"));
const firebaseAuth = require(join(firebaseToolsRoot, "lib/auth.js"));

const profiles = [
  { name: "Aaron Mishal", journeys: 43, distance: 215.4, streak: 9 },
  { name: "Meera Joseph", journeys: 41, distance: 187.2, streak: 7 },
  { name: "Rahul Ramesh", journeys: 28, distance: 152.8, streak: 12 },
  { name: "Fathima Rahman", journeys: 30, distance: 141.3, streak: 6 },
  { name: "Nikhil Varghese", journeys: 24, distance: 126.7, streak: 5 },
  { name: "Ananya Nair", journeys: 21, distance: 111.8, streak: 8 },
  { name: "Aditya Menon", journeys: 19, distance: 98.3, streak: 4 },
  { name: "Diya Thomas", journeys: 16, distance: 82.6, streak: 6 },
  { name: "Aparna Biju", journeys: 13, distance: 65.4, streak: 3 },
  { name: "Vivek Suresh", journeys: 10, distance: 48.9, streak: 2 },
];

const stringValue = (value) => ({ stringValue: value });
const integerValue = (value) => ({ integerValue: String(value) });
const doubleValue = (value) => ({ doubleValue: value });
const timestampValue = (value) => ({ timestampValue: value.toISOString() });

async function projectId() {
  const config = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  const projects = config.projects ?? {};
  const selected = projects.prod ?? projects.default ?? Object.values(projects)[0];
  if (typeof selected !== "string" || !selected) throw new Error("No Firebase project is configured in .firebaserc.");
  return selected;
}

function updateWrite(project, collection, documentId, fields) {
  return {
    update: {
      name: `projects/${project}/databases/(default)/documents/${collection}/${documentId}`,
      fields,
    },
  };
}

async function accessToken() {
  const account = firebaseAuth.getProjectDefaultAccount(process.cwd()) ?? firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI is not signed in. Run `npx firebase login` first.");
  const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, []);
  if (!token?.access_token) throw new Error("Firebase CLI could not obtain an access token.");
  return token.access_token;
}

async function seed() {
  const project = await projectId();
  const now = new Date();
  const writes = profiles.flatMap((profile, index) => {
    const number = String(index + 1).padStart(2, "0");
    const uid = `veyro_showcase_${number}`;
    const leaderboardId = `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const joinedAt = new Date(Date.UTC(2026, 0, index + 2, 6, 30));
    const email = `veyro.demo.${number}@sahrdaya.ac.in`;

    return [
      updateWrite(project, "users", uid, {
        uid: stringValue(uid),
        displayName: stringValue(profile.name),
        email: stringValue(email),
        photoURL: { nullValue: null },
        leaderboardId: stringValue(leaderboardId),
        createdAt: timestampValue(joinedAt),
        lastSeenAt: timestampValue(now),
      }),
      updateWrite(project, "leaderboardOwners", leaderboardId, {
        ownerUid: stringValue(uid),
        createdAt: timestampValue(joinedAt),
      }),
      updateWrite(project, "leaderboardEntries", leaderboardId, {
        visible: { booleanValue: true },
        displayName: stringValue(profile.name),
        displayNameNormalized: stringValue(profile.name.toLocaleLowerCase("en-US")),
        photoURL: { nullValue: null },
        showPhoto: { booleanValue: false },
        totalJourneys: integerValue(profile.journeys),
        totalDistanceKm: doubleValue(profile.distance),
        longestStreak: integerValue(profile.streak),
        statsVersion: integerValue(1),
        joinedAt: timestampValue(joinedAt),
        updatedAt: timestampValue(now),
      }),
    ];
  });

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    },
  );

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error?.message ?? `Firestore returned HTTP ${response.status}.`);
  }

  console.log(`Seeded ${profiles.length} showcase profiles into ${project}.`);
}

seed().catch((error) => {
  console.error(error instanceof Error ? error.message : "Leaderboard seeding failed.");
  process.exitCode = 1;
});
