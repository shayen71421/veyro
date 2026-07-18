import { calculateJourneyInsights } from "@/lib/insights/journey-insights";

export type LeaderboardStats = {
  totalJourneys: number;
  totalDistanceKm: number;
  longestStreak: number;
};

export function calculateLeaderboardStats(journeys: readonly unknown[]): LeaderboardStats {
  const insights = calculateJourneyInsights(journeys);
  return {
    totalJourneys: insights.totalJourneys,
    totalDistanceKm: insights.totalDistanceKm,
    longestStreak: insights.longestStreak,
  };
}
