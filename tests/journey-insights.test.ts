import { describe, expect, it } from "vitest";
import {
  calculateCurrentStreak,
  calculateJourneyInsights,
  calculateLongestStreak,
  calculateNetworkCoverage,
  getDistinctJourneyDays,
  getSixMonthActivity,
  getVisitedStationIds,
} from "@/lib/insights/journey-insights";

const journey = (
  id: string,
  fromStationId: string,
  toStationId: string,
  scannedAt: Date,
  distanceKm = 5,
  stationIntervals = 4,
) => ({ id, fromStationId, toStationId, scannedAt, distanceKm, stationIntervals });

describe("journey insights", () => {
  it("calculates unique endpoint stations without inferring intermediate stations", () => {
    const journeys = [journey("1", "aluva", "vyttila", new Date(2026, 6, 1, 10))];
    expect([...getVisitedStationIds(journeys)].sort()).toEqual(["aluva", "vyttila"]);
    expect(calculateNetworkCoverage(journeys)).toBe(8);
  });

  it("deduplicates multiple journeys on the same local calendar day", () => {
    const journeys = [
      journey("1", "aluva", "pulinchodu", new Date(2026, 6, 14, 8)),
      journey("2", "pulinchodu", "aluva", new Date(2026, 6, 14, 22)),
      journey("3", "aluva", "muttom", new Date(2026, 6, 15, 9)),
    ];
    expect(getDistinctJourneyDays(journeys)).toHaveLength(2);
  });

  it("calculates a current streak only when travel occurred today or yesterday", () => {
    const now = new Date(2026, 6, 17, 18);
    const active = [
      journey("1", "aluva", "pulinchodu", new Date(2026, 6, 14, 8)),
      journey("2", "aluva", "muttom", new Date(2026, 6, 15, 8)),
      journey("3", "aluva", "vyttila", new Date(2026, 6, 16, 8)),
    ];
    expect(calculateCurrentStreak(active, now)).toBe(3);
    expect(calculateCurrentStreak([active[0]], now)).toBe(0);
  });

  it("calculates the longest run of consecutive local travel days", () => {
    const journeys = [
      journey("1", "aluva", "pulinchodu", new Date(2026, 5, 1, 23)),
      journey("2", "aluva", "muttom", new Date(2026, 5, 2, 1)),
      journey("3", "aluva", "vyttila", new Date(2026, 5, 3, 12)),
      journey("4", "muttom", "vyttila", new Date(2026, 5, 8, 12)),
      journey("5", "muttom", "aluva", new Date(2026, 5, 9, 12)),
    ];
    expect(calculateLongestStreak(journeys)).toBe(3);
  });

  it("groups journey counts and distances across the current six-month window", () => {
    const now = new Date(2026, 6, 17);
    const activity = getSixMonthActivity([
      journey("feb", "aluva", "pulinchodu", new Date(2026, 1, 4), 1.7),
      journey("apr", "muttom", "vyttila", new Date(2026, 3, 9), 8.25),
      journey("jul-1", "aluva", "vyttila", new Date(2026, 6, 1), 10),
      journey("jul-2", "vyttila", "aluva", new Date(2026, 6, 2), 10),
    ], now);
    expect(activity.map((month) => month.key)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]);
    expect(activity[1]).toMatchObject({ journeyCount: 0, distanceKm: 0 });
    expect(activity[2]).toMatchObject({ journeyCount: 1, distanceKm: 8.3 });
    expect(activity[5]).toMatchObject({ journeyCount: 2, distanceKm: 20 });
  });

  it("finds the most visited station", () => {
    const insights = calculateJourneyInsights([
      journey("1", "aluva", "muttom", new Date(2026, 6, 1)),
      journey("2", "aluva", "vyttila", new Date(2026, 6, 2)),
      journey("3", "sn-junction", "aluva", new Date(2026, 6, 3)),
    ]);
    expect(insights.mostVisitedStation?.station.id).toBe("aluva");
    expect(insights.mostVisitedStation?.count).toBe(3);
  });

  it("finds the most common directed route", () => {
    const insights = calculateJourneyInsights([
      journey("1", "aluva", "vyttila", new Date(2026, 6, 1)),
      journey("2", "aluva", "vyttila", new Date(2026, 6, 2)),
      journey("3", "vyttila", "aluva", new Date(2026, 6, 3)),
    ]);
    expect(insights.mostCommonRoute).toMatchObject({ key: "aluva->vyttila", count: 2 });
  });

  it("finds longest journeys by distance and intervals", () => {
    const insights = calculateJourneyInsights([
      journey("short", "aluva", "muttom", new Date(2026, 6, 1), 4.6, 4),
      journey("long", "aluva", "vyttila", new Date(2026, 6, 2), 22.6, 19),
    ]);
    expect(insights.longestJourneyByDistance?.id).toBe("long");
    expect(insights.longestJourneyByIntervals?.id).toBe("long");
  });

  it("returns safe zero-value insights for an empty collection", () => {
    const insights = calculateJourneyInsights([], new Date(2026, 6, 17));
    expect(insights).toMatchObject({
      totalJourneys: 0,
      totalDistanceKm: 0,
      uniqueStationsVisited: 0,
      networkCoveragePercent: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(insights.mostVisitedStation).toBeNull();
    expect(insights.firstJourneyDate).toBeNull();
  });

  it("ignores invalid and incomplete records", () => {
    const insights = calculateJourneyInsights([
      null,
      {},
      { fromStationId: "aluva", toStationId: "unknown", distanceKm: 4, stationIntervals: 2, scannedAt: new Date() },
      { fromStationId: "aluva", toStationId: "muttom", distanceKm: -1, stationIntervals: 2, scannedAt: new Date() },
      journey("valid", "aluva", "muttom", new Date(2026, 6, 1)),
    ]);
    expect(insights.totalJourneys).toBe(1);
  });

  it("breaks ties deterministically by station name, route key, date, then id", () => {
    const sameDate = new Date(2026, 6, 1);
    const insights = calculateJourneyInsights([
      journey("z", "vyttila", "aluva", sameDate, 10, 5),
      journey("a", "aluva", "vyttila", sameDate, 10, 5),
    ]);
    expect(insights.mostVisitedStation?.station.id).toBe("aluva");
    expect(insights.mostCommonRoute?.key).toBe("aluva->vyttila");
    expect(insights.longestJourneyByDistance?.id).toBe("a");
  });

  it("calculates current and previous month totals", () => {
    const insights = calculateJourneyInsights([
      journey("current", "aluva", "vyttila", new Date(2026, 6, 2), 20),
      journey("previous", "muttom", "vyttila", new Date(2026, 5, 2), 8.4),
    ], new Date(2026, 6, 17));
    expect(insights).toMatchObject({
      thisMonthJourneyCount: 1,
      thisMonthDistanceKm: 20,
      previousMonthJourneyCount: 1,
      previousMonthDistanceKm: 8.4,
    });
  });
});
