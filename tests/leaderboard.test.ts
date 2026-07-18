import { describe, expect, it } from "vitest";
import {
  competitionRank,
  formatLeaderboardMetric,
  getTopFive,
  leaderboardEntryDataSchema,
  placeCurrentUser,
  type LeaderboardEntry,
} from "@/lib/leaderboard/ranking";
import { createSafeLeaderboardSummary } from "@/lib/leaderboard/sync-leaderboard-entry";

const entry = (id: string, distance: number, journeys: number, streak: number, joinedDay: number, visible = true): LeaderboardEntry => ({
  id,
  visible,
  displayName: `Rider ${id}`,
  displayNameNormalized: `rider ${id}`,
  photoURL: null,
  showPhoto: false,
  totalJourneys: journeys,
  totalDistanceKm: distance,
  longestStreak: streak,
  statsVersion: 1,
  joinedAt: new Date(2026, 0, joinedDay),
  updatedAt: new Date(2026, 0, joinedDay),
});

const entries = [
  entry("a", 10, 8, 2, 1),
  entry("b", 30, 2, 5, 2),
  entry("c", 20, 9, 3, 3),
  entry("d", 40, 4, 1, 4),
  entry("e", 15, 6, 6, 5),
  entry("f", 50, 1, 4, 6),
];

describe("leaderboard ranking", () => {
  it("orders and limits the distance top five", () => {
    expect(getTopFive(entries, "distance").map((item) => item.id)).toEqual(["f", "d", "b", "c", "e"]);
  });

  it("orders and limits the journey top five", () => {
    expect(getTopFive(entries, "journeys").map((item) => item.id)).toEqual(["c", "a", "e", "d", "b"]);
  });

  it("orders and limits the best-streak top five", () => {
    expect(getTopFive(entries, "streak").map((item) => item.id)).toEqual(["e", "b", "f", "c", "a"]);
  });

  it("breaks ties by secondary metrics, join date, then ID", () => {
    const tied = [
      entry("z", 20, 4, 2, 1),
      entry("b", 20, 6, 2, 3),
      entry("a", 20, 6, 2, 3),
      entry("c", 20, 6, 2, 2),
    ];
    expect(getTopFive(tied, "distance").map((item) => item.id)).toEqual(["c", "a", "b", "z"]);
  });

  it("highlights a current user already inside the top five without repeating them", () => {
    const top = getTopFive(entries, "distance");
    expect(placeCurrentUser(top, entries[1], 3)).toEqual({ inTopFive: true, currentRow: null });
  });

  it("places a joined current user below the top five with competition rank", () => {
    const current = entry("you", 12, 1, 1, 8);
    const top = getTopFive(entries, "distance");
    const rank = competitionRank([...entries, current], current, "distance");
    expect(placeCurrentUser(top, current, rank)).toMatchObject({ inTopFive: false, currentRow: { rank: 6 } });
  });

  it("does not expose a position for a user who is not opted in", () => {
    expect(placeCurrentUser(getTopFive(entries, "distance"), null, null)).toEqual({ inTopFive: false, currentRow: null });
  });

  it("excludes hidden users", () => {
    expect(getTopFive([...entries, entry("hidden", 999, 999, 999, 1, false)], "distance")[0]?.id).toBe("f");
  });

  it("formats singular and plural metrics", () => {
    const one = entry("one", 1, 1, 1, 1);
    expect(formatLeaderboardMetric(one, "journeys")).toBe("1 journey");
    expect(formatLeaderboardMetric(one, "streak")).toBe("1 day");
    expect(formatLeaderboardMetric(entries[0], "journeys")).toBe("8 journeys");
    expect(formatLeaderboardMetric(entries[0], "streak")).toBe("2 days");
  });

  it("creates only safe public summary fields and hides photos by default", () => {
    const summary = createSafeLeaderboardSummary({
      displayName: "Shayen",
      photoURL: "https://example.test/photo.jpg",
      showPhoto: false,
      journeys: [],
    });
    expect(summary).toEqual({
      visible: true,
      displayName: "Shayen",
      displayNameNormalized: "shayen",
      photoURL: null,
      showPhoto: false,
      totalJourneys: 0,
      totalDistanceKm: 0,
      longestStreak: 0,
      statsVersion: 1,
    });
    expect(summary).not.toHaveProperty("email");
    expect(summary).not.toHaveProperty("ownerUid");
  });

  it("rejects invalid and unknown public fields", () => {
    const data = { ...entry("safe", 1, 1, 1, 1) } as Partial<LeaderboardEntry>;
    delete data.id;
    expect(leaderboardEntryDataSchema.safeParse({ ...data, email: "private@example.test" }).success).toBe(false);
    expect(leaderboardEntryDataSchema.safeParse({ ...data, totalJourneys: -1 }).success).toBe(false);
  });
});
