import { describe, expect, it } from "vitest";
import { kochiMetroStations } from "@/data/kochi-metro-stations";
import { matchStationName } from "@/lib/stations/route";

describe("Kochi Metro station data", () => {
  it("contains 25 uniquely ordered operational stations", () => {
    expect(kochiMetroStations).toHaveLength(25);
    expect(new Set(kochiMetroStations.map((station) => station.id)).size).toBe(25);
    expect(new Set(kochiMetroStations.map((station) => station.routeOrder)).size).toBe(25);
    expect(kochiMetroStations.every((station) => station.operational)).toBe(true);
  });

  it("starts at zero and cumulative distance never decreases", () => {
    expect(kochiMetroStations[0].cumulativeDistanceKm).toBe(0);
    for (let index = 1; index < kochiMetroStations.length; index += 1) {
      expect(kochiMetroStations[index].cumulativeDistanceKm)
        .toBeGreaterThan(kochiMetroStations[index - 1].cumulativeDistanceKm);
    }
  });

  it("each segment equals the cumulative difference", () => {
    for (let index = 0; index < kochiMetroStations.length - 1; index += 1) {
      expect(kochiMetroStations[index].distanceToNextKm)
        .toBeCloseTo(kochiMetroStations[index + 1].cumulativeDistanceKm - kochiMetroStations[index].cumulativeDistanceKm, 5);
    }
    expect(kochiMetroStations.at(-1)?.distanceToNextKm).toBeNull();
  });

  it("matches aliases and common OCR variants safely", () => {
    expect(matchStationName("S.N. Junction")?.station.id).toBe("sn-junction");
    expect(matchStationName("Changampuzha Pk")?.station.id).toBe("changampuzha-park");
    expect(matchStationName("not a station")).toBeNull();
  });
});
