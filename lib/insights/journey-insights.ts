import {
  differenceInCalendarDays,
  format,
  isSameMonth,
  isValid,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  kochiMetroStations,
  stationById,
  type KochiMetroStation,
} from "@/data/kochi-metro-stations";

export type NormalizedInsightJourney = {
  id: string;
  fromStation: KochiMetroStation;
  toStation: KochiMetroStation;
  stationIntervals: number;
  distanceKm: number;
  scannedAt: Date;
};

export type StationFrequency = {
  station: KochiMetroStation;
  count: number;
};

export type RouteFrequency = {
  key: string;
  fromStation: KochiMetroStation;
  toStation: KochiMetroStation;
  count: number;
};

export type MonthlyActivity = {
  key: string;
  label: string;
  monthStart: Date;
  journeyCount: number;
  distanceKm: number;
};

export type JourneyInsights = {
  validJourneys: NormalizedInsightJourney[];
  totalJourneys: number;
  totalDistanceKm: number;
  totalStationIntervals: number;
  visitedStationIds: Set<string>;
  firstVisitedByStation: Map<string, Date>;
  uniqueStationsVisited: number;
  totalOperationalStations: number;
  networkCoveragePercent: number;
  mostVisitedStation: StationFrequency | null;
  mostCommonOrigin: StationFrequency | null;
  mostCommonDestination: StationFrequency | null;
  mostCommonRoute: RouteFrequency | null;
  longestJourneyByDistance: NormalizedInsightJourney | null;
  longestJourneyByIntervals: NormalizedInsightJourney | null;
  firstJourneyDate: Date | null;
  latestJourneyDate: Date | null;
  currentStreak: number;
  longestStreak: number;
  thisMonthJourneyCount: number;
  thisMonthDistanceKm: number;
  previousMonthJourneyCount: number;
  previousMonthDistanceKm: number;
  monthlyActivity: MonthlyActivity[];
};

const roundOne = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10;

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function dateOf(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? new Date(value) : null;
  const candidate = recordOf(value);
  const toDate = candidate?.toDate;
  if (typeof toDate !== "function") return null;
  try {
    const converted = toDate.call(value);
    return converted instanceof Date && isValid(converted) ? new Date(converted) : null;
  } catch {
    return null;
  }
}

export function normalizeInsightJourneys(journeys: readonly unknown[]): NormalizedInsightJourney[] {
  return journeys.flatMap((value, index) => {
    const record = recordOf(value);
    if (!record) return [];
    const fromStationId = record.fromStationId;
    const toStationId = record.toStationId;
    const distanceKm = record.distanceKm;
    const stationIntervals = record.stationIntervals;
    const scannedAt = dateOf(record.scannedAt);
    if (
      typeof fromStationId !== "string"
      || typeof toStationId !== "string"
      || fromStationId === toStationId
      || typeof distanceKm !== "number"
      || !Number.isFinite(distanceKm)
      || distanceKm < 0
      || typeof stationIntervals !== "number"
      || !Number.isInteger(stationIntervals)
      || stationIntervals < 0
      || !scannedAt
    ) return [];
    const fromStation = stationById.get(fromStationId);
    const toStation = stationById.get(toStationId);
    if (!fromStation?.operational || !toStation?.operational) return [];
    return [{
      id: typeof record.id === "string" ? record.id : `journey-${index}`,
      fromStation,
      toStation,
      stationIntervals,
      distanceKm,
      scannedAt,
    }];
  });
}

export function getDistinctJourneyDays(journeys: readonly unknown[]): Date[] {
  const days = new Map<string, Date>();
  for (const journey of normalizeInsightJourneys(journeys)) {
    const day = startOfDay(journey.scannedAt);
    days.set(format(day, "yyyy-MM-dd"), day);
  }
  return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
}

export function calculateCurrentStreak(journeys: readonly unknown[], now = new Date()): number {
  const days = getDistinctJourneyDays(journeys);
  if (!days.length) return 0;
  const latest = days.at(-1);
  if (!latest) return 0;
  const distanceFromToday = differenceInCalendarDays(startOfDay(now), latest);
  if (distanceFromToday < 0 || distanceFromToday > 1) return 0;
  let streak = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (differenceInCalendarDays(days[index], days[index - 1]) !== 1) break;
    streak += 1;
  }
  return streak;
}

export function calculateLongestStreak(journeys: readonly unknown[]): number {
  const days = getDistinctJourneyDays(journeys);
  if (!days.length) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (differenceInCalendarDays(days[index], days[index - 1]) === 1) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function getVisitedStationIds(journeys: readonly unknown[]): Set<string> {
  const visited = new Set<string>();
  for (const journey of normalizeInsightJourneys(journeys)) {
    visited.add(journey.fromStation.id);
    visited.add(journey.toStation.id);
  }
  return visited;
}

export function calculateNetworkCoverage(journeys: readonly unknown[]): number {
  const operationalCount = kochiMetroStations.filter((station) => station.operational).length;
  return operationalCount ? Math.round(getVisitedStationIds(journeys).size / operationalCount * 100) : 0;
}

function rankStations(counts: Map<string, number>): StationFrequency | null {
  return [...counts.entries()]
    .flatMap(([id, count]) => {
      const station = stationById.get(id);
      return station ? [{ station, count }] : [];
    })
    .sort((a, b) => b.count - a.count || a.station.name.localeCompare(b.station.name) || a.station.id.localeCompare(b.station.id))[0] ?? null;
}

function rankJourney(
  journeys: NormalizedInsightJourney[],
  metric: (journey: NormalizedInsightJourney) => number,
): NormalizedInsightJourney | null {
  return [...journeys].sort((a, b) =>
    metric(b) - metric(a)
    || a.scannedAt.getTime() - b.scannedAt.getTime()
    || a.id.localeCompare(b.id)
  )[0] ?? null;
}

export function getSixMonthActivity(journeys: readonly unknown[], now = new Date()): MonthlyActivity[] {
  const normalized = normalizeInsightJourneys(journeys);
  const currentMonth = startOfMonth(now);
  return Array.from({ length: 6 }, (_, index) => subMonths(currentMonth, 5 - index)).map((monthStart) => {
    const inMonth = normalized.filter((journey) => isSameMonth(journey.scannedAt, monthStart));
    return {
      key: format(monthStart, "yyyy-MM"),
      label: format(monthStart, "MMM"),
      monthStart,
      journeyCount: inMonth.length,
      distanceKm: roundOne(inMonth.reduce((sum, journey) => sum + journey.distanceKm, 0)),
    };
  });
}

export function calculateJourneyInsights(journeys: readonly unknown[], now = new Date()): JourneyInsights {
  const validJourneys = normalizeInsightJourneys(journeys);
  const operationalStations = kochiMetroStations.filter((station) => station.operational);
  const stationCounts = new Map<string, number>();
  const originCounts = new Map<string, number>();
  const destinationCounts = new Map<string, number>();
  const routeCounts = new Map<string, RouteFrequency>();
  const firstVisitedByStation = new Map<string, Date>();
  const visitedStationIds = new Set<string>();

  for (const journey of validJourneys) {
    for (const station of [journey.fromStation, journey.toStation]) {
      visitedStationIds.add(station.id);
      stationCounts.set(station.id, (stationCounts.get(station.id) ?? 0) + 1);
      const firstVisit = firstVisitedByStation.get(station.id);
      if (!firstVisit || journey.scannedAt < firstVisit) firstVisitedByStation.set(station.id, journey.scannedAt);
    }
    originCounts.set(journey.fromStation.id, (originCounts.get(journey.fromStation.id) ?? 0) + 1);
    destinationCounts.set(journey.toStation.id, (destinationCounts.get(journey.toStation.id) ?? 0) + 1);
    const routeKey = `${journey.fromStation.id}->${journey.toStation.id}`;
    const existingRoute = routeCounts.get(routeKey);
    routeCounts.set(routeKey, {
      key: routeKey,
      fromStation: journey.fromStation,
      toStation: journey.toStation,
      count: (existingRoute?.count ?? 0) + 1,
    });
  }

  const sortedByDate = [...validJourneys].sort((a, b) =>
    a.scannedAt.getTime() - b.scannedAt.getTime() || a.id.localeCompare(b.id)
  );
  const monthlyActivity = getSixMonthActivity(journeys, now);
  const currentMonth = startOfMonth(now);
  const previousMonth = subMonths(currentMonth, 1);
  const currentJourneys = validJourneys.filter((journey) => isSameMonth(journey.scannedAt, currentMonth));
  const previousJourneys = validJourneys.filter((journey) => isSameMonth(journey.scannedAt, previousMonth));
  const mostCommonRoute = [...routeCounts.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))[0] ?? null;

  return {
    validJourneys,
    totalJourneys: validJourneys.length,
    totalDistanceKm: roundOne(validJourneys.reduce((sum, journey) => sum + journey.distanceKm, 0)),
    totalStationIntervals: validJourneys.reduce((sum, journey) => sum + journey.stationIntervals, 0),
    visitedStationIds,
    firstVisitedByStation,
    uniqueStationsVisited: visitedStationIds.size,
    totalOperationalStations: operationalStations.length,
    networkCoveragePercent: operationalStations.length ? Math.round(visitedStationIds.size / operationalStations.length * 100) : 0,
    mostVisitedStation: rankStations(stationCounts),
    mostCommonOrigin: rankStations(originCounts),
    mostCommonDestination: rankStations(destinationCounts),
    mostCommonRoute,
    longestJourneyByDistance: rankJourney(validJourneys, (journey) => journey.distanceKm),
    longestJourneyByIntervals: rankJourney(validJourneys, (journey) => journey.stationIntervals),
    firstJourneyDate: sortedByDate[0]?.scannedAt ?? null,
    latestJourneyDate: sortedByDate.at(-1)?.scannedAt ?? null,
    currentStreak: calculateCurrentStreak(validJourneys.map((journey) => ({
      id: journey.id,
      fromStationId: journey.fromStation.id,
      toStationId: journey.toStation.id,
      distanceKm: journey.distanceKm,
      stationIntervals: journey.stationIntervals,
      scannedAt: journey.scannedAt,
    })), now),
    longestStreak: calculateLongestStreak(validJourneys.map((journey) => ({
      id: journey.id,
      fromStationId: journey.fromStation.id,
      toStationId: journey.toStation.id,
      distanceKm: journey.distanceKm,
      stationIntervals: journey.stationIntervals,
      scannedAt: journey.scannedAt,
    }))),
    thisMonthJourneyCount: currentJourneys.length,
    thisMonthDistanceKm: roundOne(currentJourneys.reduce((sum, journey) => sum + journey.distanceKm, 0)),
    previousMonthJourneyCount: previousJourneys.length,
    previousMonthDistanceKm: roundOne(previousJourneys.reduce((sum, journey) => sum + journey.distanceKm, 0)),
    monthlyActivity,
  };
}
