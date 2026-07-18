# Veyro

Veyro is a mobile-first, privacy-conscious Kochi Metro journey journal. A signed-in rider chooses Take Photo to open the phone's native camera or Choose Image to use an existing photo. The browser detects the QR code, reads the visible route from that same image with OCR, validates the stations, and atomically adds a journey to Cloud Firestore.

The product is a journey logger, not a ticket validator. It does not decode the Metro's internal QR format, create tickets, validate entry, track location, or support check-in/check-out.

## Veyro Passport and Travel Insights

The protected `/passport/` page turns the signed-in rider's existing journey documents into an endpoint-based station passport, network coverage, local-calendar journey streaks, six-month activity, monthly comparisons, and personal travel records. Every operational station appears in route order. A station is stamped only when it was an origin or destination; intermediate stations are deliberately not inferred.

Passport metrics are calculated in the browser and are never written back as editable aggregate documents. Home, Profile, and Passport share a short-lived in-memory promise cache for the user's one-time, paginated journey reads. There are no permanent Firestore listeners.

The share action creates a public `/passport/share/` link containing a validated, Base64URL-encoded recap in the URL fragment. The fragment is handled only in the browser and is not sent to Firebase Hosting. It contains only the public display name and safe aggregate travel statistics—not an email, UID, ticket reference, QR value, ticket image, journey ID, or exact journey time. No public Firestore document is created and opening a recap link performs no account read. Because the recap is client-created and has no trusted backend signature, it is a personal story card rather than a verified official record.

Statistics use deterministic tie handling: station ties sort by official station name and then station ID; route ties sort by the directed route key; longest-journey ties use the earliest journey date and then journey ID. Streaks deduplicate local calendar dates, and a current streak remains active only when the latest travel day is today or yesterday.

## Veyro Community Leaderboard

The public `/leaderboard/` route offers three opt-in categories only: Distance, Journeys, and Best Streak. Anyone can view safe, visible leaderboard summaries; signing in is required to join, leave, synchronize statistics, or see a personal rank. Best Streak uses the stable longest historical streak rather than the current streak. Each category performs a one-time, cached `limit(5)` query; Home loads only Distance, Passport loads the three personal ranks only after the rider opens that section, and manual refresh clears the session cache. No Firestore listeners or scheduled work are used.

Participation is optional and profile-photo visibility defaults to off. On first join, the browser generates a random UUID. The UID-to-public-ID relationship is kept privately in `users/{uid}.leaderboardId` and the non-listable `leaderboardOwners/{leaderboardId}` collection. The public `leaderboardEntries/{leaderboardId}` document contains only:

- Public display name and normalized display name
- Optional explicitly enabled Google profile photo
- Total journeys, total distance, and longest streak
- Visibility, version, and join/update timestamps

It never contains a Firebase UID, email, ticket data, QR value, journey ID, route, or exact journey timestamp. Leaving sets `visible` to false and keeps private journeys untouched. Rules require exact public fields, validate numeric limits, preserve `joinedAt`, and permit updates only through the private ownership mapping. Deploy both the updated rules and composite indexes with `firebase deploy --only firestore`.

Top-five rows use deterministic category-specific secondary tie-breakers. Spark-efficient public positions use Firestore count aggregation for entries with a strictly greater primary metric, so primary-metric ties share a competition rank such as `1, 2, 2, 4`.

### Spark-only leaderboard limitation

Leaderboard summaries are calculated in the browser from the rider's Veyro journeys and the interface provides no manual metric editing. Because this Spark-only architecture has no trusted backend, a technically skilled person who modifies the client can attempt to submit altered summary statistics. The leaderboard is therefore a community feature, not a cheat-proof or independently verified Metro record. Production-grade verification would require a trusted backend, which remains deliberately outside this project.

### Showcase leaderboard seed

For hackathon demonstrations, `npm run seed:leaderboard` writes ten deterministic showcase profiles to the configured production Firestore project. The script uses the already authenticated Firebase CLI developer session and is not included in the browser bundle. It creates matching private user/ownership records and visible public leaderboard summaries. Synthetic `veyro.demo.*@sahrdaya.ac.in` addresses are stored only in protected user documents and are never published in leaderboard entries. Running the command again updates the same deterministic records rather than creating duplicates.

## Veyro Explore and Veyro Finds

The protected `/explore/` experience is a bounded, one-time-read discovery layer around operational Kochi Metro stations. Community recommendations are called **Veyro Finds**. They are traveller-created or “Veyro Curated”; neither label means an official Kochi Metro recommendation.

Explore uses an explainable browser-only score from endpoint frequency, recent endpoints, stations along common routes, private loved/saved/category signals, curated status, community love, freshness, and new-station opportunities. Exact scores and journey counts are never published. Hidden and exact “Not for Me” Finds are excluded; visited Finds receive a ranking penalty. Ties use score, love count, publication date, and public Find ID. Candidate reads are bounded to relevant stations, popular, recent, and curated pools, merged by Find ID, and cached only in memory for the current session. No snapshot listeners, AI APIs, full-collection text search, or private travel-profile documents are used.

A journey ending at a station never marks any place visited. Places enter `users/{uid}/exploreInteractions` only when the rider explicitly taps **Mark as Visited**. Saves, visits, hidden choices, “Not for Me,” and visit dates remain private. **Loved It** is available only after an explicit visit and changes the public `loveCount` by exactly one through a Firestore transaction. There is no public dislike counter.

### Local Explorer and moderation

Local Explorer submission eligibility requires both five valid Veyro journeys and 25 km. The browser calculates this from the rider’s existing journeys and writes a versioned snapshot to `exploreEligibility/{uid}`. Community submissions are atomically created with a private owner mapping and owner-facing summary and always start as `pending`. They cannot be self-published. Published edits return to pending review.

The protected `/admin/explore/` route checks `admins/{uid}` through Firestore Rules. Enabled administrators can review pending Finds, approve or reject with a message, hide/restore/remove published content, review reports, and read private source records. There is no email allowlist or public “Become Admin” action.

Because Spark has no trusted backend, a modified client can attempt to forge eligibility or manipulate engagement using multiple accounts. Rules constrain schemas, ownership, eligibility thresholds, status transitions, and reaction deltas, while mandatory administrator approval limits forged submission impact. Explore is community guidance, not a cheat-proof or independently verified record.

### Local administrator bootstrap

The Admin SDK exists only in `devDependencies` and `scripts/`; it is never imported by client code or deployed to Hosting. Prefer a service account stored outside the repository:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/private/path/service-account.json"
export FIREBASE_PROJECT_ID="your-project-id"
npm run admin:grant -- --uid=<FIREBASE_UID>
```

For a trusted local workstation, the scripts can alternatively use the currently authenticated Firebase CLI developer session after `npx firebase login --reauth`. Firebase CLI exposes that account as an authorized-user application-default credential under the user’s Firebase configuration directory; it is never printed or copied into the project.

Revoke administrative access without deleting journeys, submissions, or interactions:

```bash
npm run admin:revoke -- --uid=<FIREBASE_UID>
```

The repository ignores `service-account*.json`, `firebase-admin-key*.json`, and `*-firebase-adminsdk-*.json`. Never commit, print, or embed service-account contents in `NEXT_PUBLIC_*` variables.

### Researched curated seed

`data/explore-seed.ts` contains 16 conservatively verified Finds across 12 operational stations. Each has at least two evidence records in `data/explore-seed-sources.ts`; source URLs are never copied to the public Find. Research coverage, deferrals, uncertainties, and estimated walking times are documented in `data/explore-seed-report.md`.

Validate without credentials:

```bash
npm run explore:seed:validate
```

Credentialed dry run (the default; performs no writes):

```bash
npm run explore:seed:dry -- --uid=<ENABLED_ADMIN_UID>
```

Apply only after reviewing the report and validation output:

```bash
npm run explore:seed:apply -- --uid=<ENABLED_ADMIN_UID>
```

Applying is explicit, idempotent, batched, and `seedVersion`-aware. It writes the public curated Find, private ownership record, and administrator-only source record. Running it twice does not create duplicate Finds. To add or reverify a place, update both seed files with current authoritative evidence, update the report and verification date, increment `seedVersion`, run validation and dry-run, then apply intentionally.

### Explore data and privacy

- `exploreFinds/{findId}`: public-safe content, station/coordinates, author badge, moderation status, and love count
- `exploreFindOwners/{findId}`: protected UID mapping
- `users/{uid}/exploreSubmissions/{findId}`: private contributor status and moderation message
- `users/{uid}/exploreInteractions/{findId}`: private saves, visits, hides, and reactions
- `exploreReports/{reportId}`: private moderation reports
- `exploreSourceRecords/{findId}`: administrator-only research evidence
- `exploreEligibility/{uid}`: owner-only client-calculated eligibility snapshot
- `admins/{uid}`: protected administrator role and enabled state

Explore stores no images because the Spark architecture deliberately avoids Cloud Storage and public image uploads. It stores validated Kochi-region coordinates and generates a Google Maps search URL in the browser, so no paid map API, embedded map key, scraping, or arbitrary public website URL is needed. Users must verify current access, prices, opening hours, route conditions, and suitability before visiting.

Composite indexes in `firestore.indexes.json` support bounded published queries by station, category, curation, love, publication date, walking time, environment, and cost. Deploy rules and indexes together after local emulator tests:

```bash
firebase deploy --only firestore
```

## Stack

- Next.js App Router, strict TypeScript, Tailwind CSS, and static export
- Firebase Authentication with Google
- Cloud Firestore client SDK and transactions
- Firebase Hosting serving `out/`
- Firebase Local Emulator Suite
- Firebase Admin SDK in local setup/seed scripts only
- `@zxing/browser`, Tesseract.js, Zod, GSAP, Lucide, date-fns, and html-to-image
- A small manual service worker and web app manifest

## Why this remains Firebase Spark compatible

Veyro uses only Firebase Authentication, Firestore, Hosting, and local emulators. Next.js builds to static files with `output: "export"`; there is no server runtime. The repository has no Cloud Functions, Firebase App Hosting, Cloud Run, Cloud Storage, API routes, Server Actions, phone authentication, extensions, scheduled work, backups, PITR, or other billing-dependent Google Cloud services.

Ticket images are processed in browser memory and are never uploaded. Reads are one-time queries, journey history is paginated, the dashboard queries only the signed-in user's documents, and there are no live listeners or analytics documents. Totals are calculated from journey documents instead of editable counters.

## Local setup

Requirements: Node.js 22+, npm, Java 11+ for the Firestore emulator, and a Firebase project that remains on Spark.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For local Firebase emulators, add `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` to `.env.local`, then run `firebase emulators:start` in another terminal. The Take Photo action uses the phone's native system camera through a file input rather than `getUserMedia`, so Veyro does not run an embedded live-camera scanner.

## Firebase project setup

1. Create or select the existing Firebase project without upgrading from Spark.
2. In Authentication → Sign-in method, enable Google only. Keep Email/Password and Phone disabled. Add the Hosting domain and local development domains to Authorized domains.
3. Create a Cloud Firestore database. Deploy `firestore.rules` and `firestore.indexes.json` with `firebase deploy --only firestore`.
4. Register a web app and copy its public configuration values into `.env.local`. These values identify the Firebase app; Firestore Security Rules provide data access control. Never commit `.env.local`.
5. Copy `.firebaserc.example` to `.firebaserc` and replace the placeholder project ID.

Required variables:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_DEMO_MODE=false
```

## Static build and Firebase Hosting

```bash
npm run typecheck
npm run lint
npm test
npm run build
firebase deploy --only hosting
```

`npm run build` creates the deployable `out/` directory. `firebase.json` points Hosting at that directory, caches hashed Next.js assets, avoids Functions rewrites, and disables long-lived caching for the service worker.

## Emulator and Security Rules tests

```bash
npm run test:rules
```

The suite covers unauthenticated access, cross-user journey reads, duplicate claims, claim listing, private payload reads, immutable journeys, and valid atomic claim + payload + journey creation. The default `npm test` suite validates station uniqueness, order, monotonic cumulative distance, segment sums, route distance, aliases, endpoint-only network coverage, local-calendar streaks, six-month grouping, records, invalid data handling, and deterministic insight ties.

## One-scan flow and duplicate testing

The browser validates the raw QR's trimmed UTF-8 byte length (8–700), preserves its internal contents unchanged, Base64URL-encodes the UTF-8 bytes as `ticketKey`, and starts a Firestore transaction. The transaction reads only `ticketClaims/{ticketKey}`. If absent, it creates the safe claim, write-only private payload, and journey atomically. Repeating the same scan produces:

> This ticket has already been added to Veyro. A ticket can only be used once.

For development, set `NEXT_PUBLIC_DEMO_MODE=true` and restart the dev server. Scanner controls then simulate a successful scan, duplicate ticket, or unreadable route. Demo mode is never enabled automatically and must remain `false` in production.

## Raw QR privacy warning

The product requirement explicitly stores the complete, unchanged QR value without hashing. It is stored only in `privateTicketPayloads/{ticketKey}`. Normal clients cannot read, list, update, or delete that collection. The safe `ticketClaims` document contains only `claimed` and `createdAt`. The UI, share image, URLs, logs, analytics, browser storage, service worker, and caches never include the raw QR. Ticket images are never persisted or uploaded.

The Base64URL key is reversible encoding, not encryption or hashing. Firestore rules prevent ordinary duplicate use and require the claim, payload, and journey to be created atomically.

### Spark-only tamper-resistance limitation

Because Spark provides no trusted application backend here, the deterministic key is generated by client code. A determined person who modifies the client can deliberately submit a different key that does not correspond to the raw QR value. Firestore Security Rules cannot calculate Base64URL from arbitrary UTF-8 text to prove that correspondence. Therefore this Phase 1 design is reliable for normal application usage but is **not completely tamper-proof**.

Production-grade resistance to a maliciously modified client would require a trusted backend to derive and validate the key. That is deliberately outside Phase 1 and outside this strict Spark-only architecture; Cloud Functions are not added as a workaround.

## OCR and browser limitations

OCR runs locally with Tesseract.js after upscaling and grayscale/contrast preprocessing. It supports labelled paper tickets (`From:` / `To:`), mobile routes using `→`, `->`, `>`, or `TO`, and mobile layouts where a graphical arrow causes the station names to be recognized on separate lines. Results below the configurable 0.72 confidence threshold require a rescan; stations cannot be manually corrected. Glare, blur, low-resolution cameras, stylized fonts, or uncached OCR language assets can prevent recognition. QR detection, OCR dependency loading when uncached, duplicate checks, and submission require a connection. Veyro never queues tickets for background sync and displays “You need an internet connection to add a journey.”

## Kochi Metro data

Station order, coordinates, and route distances come from KMRL's official GTFS open-data feed, cross-checked against the official KMRL station page and DPR plus a secondary station list. GTFS `shape_dist_traveled` values are normalized so Aluva is 0 km. Sources and access dates are recorded in `data/kochi-metro-data-sources.ts`; validation is automated in `tests/stations.test.ts`.

Contains data provided by Kochi Metro Rail Limited. This project is not presented as endorsed by KMRL.
