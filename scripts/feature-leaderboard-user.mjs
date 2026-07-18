import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const firebaseToolsRoot = dirname(require.resolve("firebase-tools/package.json"));
const firebaseAuth = require(join(firebaseToolsRoot, "lib/auth.js"));

async function projectId() {
  const config = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  const projects = config.projects ?? {};
  const selected = projects.prod ?? projects.default ?? Object.values(projects)[0];
  if (typeof selected !== "string" || !selected) throw new Error("No Firebase project is configured in .firebaserc.");
  return selected;
}

async function accessToken() {
  const account = firebaseAuth.getProjectDefaultAccount(process.cwd()) ?? firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI is not signed in. Run `npx firebase login` first.");
  const token = await firebaseAuth.getAccessToken(account.tokens.refresh_token, []);
  if (!token?.access_token) throw new Error("Firebase CLI could not obtain an access token.");
  return token.access_token;
}

async function request(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error?.message ?? `Firestore returned HTTP ${response.status}.`);
  }
  return response.json();
}

function numberFromFirestore(value) {
  if (typeof value?.doubleValue === "number") return value.doubleValue;
  if (typeof value?.integerValue === "string") return Number(value.integerValue);
  return 0;
}

function longestStreak(journeys) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const days = [...new Set(journeys.flatMap((journey) => {
    const value = journey.fields?.scannedAt?.timestampValue;
    return value ? [formatter.format(new Date(value))] : [];
  }))].sort();
  let current = 0;
  let longest = 0;
  let previous = null;
  for (const day of days) {
    const timestamp = Date.parse(`${day}T00:00:00Z`);
    current = previous !== null && timestamp - previous === 86_400_000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = timestamp;
  }
  return longest;
}

async function featureUser(email, restore = false) {
  const project = await projectId();
  const token = await accessToken();
  const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const results = await request(`${root}:runQuery`, token, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "email" },
            op: "EQUAL",
            value: { stringValue: email },
          },
        },
        limit: 2,
      },
    }),
  });

  const matches = results.flatMap((result) => result.document ? [result.document] : []);
  if (matches.length !== 1) throw new Error(`Expected one profile for ${email}, found ${matches.length}.`);
  const fields = matches[0].fields ?? {};
  const leaderboardId = fields.leaderboardId?.stringValue;
  const photoURL = fields.photoURL?.stringValue;
  const displayName = fields.displayName?.stringValue ?? "Veyro rider";
  if (!leaderboardId) throw new Error("This profile has not joined the leaderboard.");
  if (!photoURL) throw new Error("This Google profile does not currently have a photo URL in Veyro.");

  let metrics = { totalJourneys: 44, totalDistanceKm: 216, longestStreak: 13 };
  if (restore) {
    const journeyResults = await request(`${root}:runQuery`, token, {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "journeys" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "ownerUid" },
              op: "EQUAL",
              value: { stringValue: fields.uid?.stringValue },
            },
          },
        },
      }),
    });
    const journeys = journeyResults.flatMap((result) => result.document ? [result.document] : []);
    metrics = {
      totalJourneys: journeys.length,
      totalDistanceKm: Math.round((journeys.reduce((sum, journey) =>
        sum + numberFromFirestore(journey.fields?.distanceKm), 0) + Number.EPSILON) * 10) / 10,
      longestStreak: longestStreak(journeys),
    };
  }

  const entryName = `projects/${project}/databases/(default)/documents/leaderboardEntries/${leaderboardId}`;
  await request(`${root}:commit`, token, {
    method: "POST",
    body: JSON.stringify({
      writes: [{
        update: {
          name: entryName,
          fields: {
            visible: { booleanValue: true },
            photoURL: { stringValue: photoURL },
            showPhoto: { booleanValue: true },
            totalJourneys: { integerValue: String(metrics.totalJourneys) },
            totalDistanceKm: { doubleValue: metrics.totalDistanceKm },
            longestStreak: { integerValue: String(metrics.longestStreak) },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        },
        updateMask: {
          fieldPaths: [
            "visible",
            "photoURL",
            "showPhoto",
            "totalJourneys",
            "totalDistanceKm",
            "longestStreak",
            "updatedAt",
          ],
        },
      }],
    }),
  });

  if (restore) {
    console.log(`Restored ${displayName} from ${metrics.totalJourneys} actual journey record(s).`);
  } else {
    console.log(`Featured ${displayName} at the top of all leaderboard categories.`);
  }
  console.log("Public Google profile photo remains enabled.");
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run feature:leaderboard-user -- user@example.com");
  process.exitCode = 1;
} else {
  featureUser(email, process.argv.includes("--restore")).catch((error) => {
    console.error(error instanceof Error ? error.message : "Could not feature leaderboard user.");
    process.exitCode = 1;
  });
}
