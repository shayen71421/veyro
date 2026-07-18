import { calculateJourneyInsights } from "@/lib/insights/journey-insights";

export const EXPLORER_JOURNEYS_REQUIRED = 5;
export const EXPLORER_DISTANCE_REQUIRED_KM = 25;

export type ExplorerEligibility = {
  totalJourneys: number;
  totalDistanceKm: number;
  eligible: boolean;
  missingJourneys: number;
  missingDistanceKm: number;
};

export function calculateExplorerEligibility(journeys: readonly unknown[]): ExplorerEligibility {
  const insights = calculateJourneyInsights(journeys);
  const totalJourneys = insights.totalJourneys;
  const totalDistanceKm = insights.totalDistanceKm;
  return {
    totalJourneys,
    totalDistanceKm,
    eligible: totalJourneys >= EXPLORER_JOURNEYS_REQUIRED && totalDistanceKm >= EXPLORER_DISTANCE_REQUIRED_KM,
    missingJourneys: Math.max(0, EXPLORER_JOURNEYS_REQUIRED - totalJourneys),
    missingDistanceKm: Math.round(Math.max(0, EXPLORER_DISTANCE_REQUIRED_KM - totalDistanceKm) * 10) / 10,
  };
}
