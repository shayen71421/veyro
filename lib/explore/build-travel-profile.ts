import { stationById } from "@/data/kochi-metro-stations";
import type { Journey } from "@/types";

export type TravelProfile = {
  endpointFrequency: Map<string, number>;
  recentEndpoints: Set<string>;
  routeStations: Set<string>;
  usedEndpoints: Set<string>;
};

function journeyDate(value: Journey["scannedAt"]): number {
  return value instanceof Date ? value.getTime() : value.toDate().getTime();
}

export function buildTravelProfile(journeys: readonly Journey[]): TravelProfile {
  const endpointFrequency = new Map<string, number>();
  const routeFrequency = new Map<string, number>();
  const usedEndpoints = new Set<string>();
  for (const journey of journeys) {
    if (!stationById.has(journey.fromStationId) || !stationById.has(journey.toStationId)) continue;
    for (const stationId of [journey.fromStationId, journey.toStationId]) {
      endpointFrequency.set(stationId, (endpointFrequency.get(stationId) ?? 0) + 1);
      usedEndpoints.add(stationId);
    }
    const key = [journey.fromStationId, journey.toStationId].sort().join("|");
    routeFrequency.set(key, (routeFrequency.get(key) ?? 0) + 1);
  }
  const recentEndpoints = new Set([...journeys].sort((a, b) => journeyDate(b.scannedAt) - journeyDate(a.scannedAt))
    .slice(0, 5).flatMap((journey) => [journey.fromStationId, journey.toStationId]));
  const routeStations = new Set<string>();
  for (const [key, count] of routeFrequency) {
    if (count < 2 && routeFrequency.size > 1) continue;
    const [leftId, rightId] = key.split("|");
    const left = stationById.get(leftId); const right = stationById.get(rightId);
    if (!left || !right) continue;
    for (const station of stationById.values()) {
      if (station.routeOrder >= Math.min(left.routeOrder, right.routeOrder)
        && station.routeOrder <= Math.max(left.routeOrder, right.routeOrder)) routeStations.add(station.id);
    }
  }
  return { endpointFrequency, recentEndpoints, routeStations, usedEndpoints };
}
