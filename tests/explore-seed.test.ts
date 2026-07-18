import { describe, expect, it } from "vitest";
import { exploreSeed } from "@/data/explore-seed";
import { exploreSeedSources } from "@/data/explore-seed-sources";
import { stationById } from "@/data/kochi-metro-stations";
import { costTypes, exploreCategories } from "@/lib/explore/types";
import { KOCHI_BOUNDS } from "@/lib/explore/schemas";

describe("Explore seed research data", () => {
  it("has unique real-looking IDs, titles and coordinates", () => {
    expect(new Set(exploreSeed.map((item) => item.id)).size).toBe(exploreSeed.length);
    expect(new Set(exploreSeed.map((item) => item.title.toLowerCase())).size).toBe(exploreSeed.length);
    expect(new Set(exploreSeed.map((item) => `${item.latitude},${item.longitude}`)).size).toBe(exploreSeed.length);
    expect(exploreSeed.every((item) => !/placeholder|todo|example place/i.test(`${item.title} ${item.description}`))).toBe(true);
  });
  it("uses operational stations, valid bounds, walking times and allowlists", () => {
    for (const item of exploreSeed) {
      expect(stationById.get(item.stationId)?.operational).toBe(true);
      expect(stationById.get(item.stationId)?.name).toBe(item.stationName);
      expect(item.walkingMinutes).toBeGreaterThanOrEqual(1); expect(item.walkingMinutes).toBeLessThanOrEqual(25);
      expect(item.latitude).toBeGreaterThanOrEqual(KOCHI_BOUNDS.minLatitude); expect(item.latitude).toBeLessThanOrEqual(KOCHI_BOUNDS.maxLatitude);
      expect(item.longitude).toBeGreaterThanOrEqual(KOCHI_BOUNDS.minLongitude); expect(item.longitude).toBeLessThanOrEqual(KOCHI_BOUNDS.maxLongitude);
      expect(exploreCategories).toContain(item.category); expect(costTypes).toContain(item.costType);
      expect(item.verifiedAt).toMatch(/^2026-\d{2}-\d{2}$/);
    }
  });
  it("has at least two non-fake sources for every Find", () => {
    expect(exploreSeedSources).toHaveLength(exploreSeed.length);
    for (const item of exploreSeed) {
      const source = exploreSeedSources.find((record) => record.findId === item.id);
      expect(source?.sources.length).toBeGreaterThanOrEqual(2);
      expect(source?.sources.every((entry) => /^https:\/\//.test(entry.url) && !entry.url.includes("example.com"))).toBe(true);
      expect(source?.locationVerified).toBe(true); expect(source?.stationProximityVerified).toBe(true);
    }
  });
});
