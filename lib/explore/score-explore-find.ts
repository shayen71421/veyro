import type { CategoryPreferences } from "@/lib/explore/build-category-preferences";
import type { TravelProfile } from "@/lib/explore/build-travel-profile";
import type { ExploreFind, ExploreInteraction } from "@/lib/explore/types";

export const EXPLORE_SCORE = {
  frequentEndpoint: 35, recentEndpoint: 22, routeStation: 16, lovedCategory: 24,
  savedCategory: 10, curated: 8, newStation: 10, recent: 6, visited: -18,
  notForMeCategory: -40, exclude: -1000,
} as const;

export function scoreExploreFind(find: ExploreFind, travel: TravelProfile, preferences: CategoryPreferences, interaction?: ExploreInteraction, now = new Date()): number {
  if (interaction?.hidden || interaction?.reaction === "not_for_me") return EXPLORE_SCORE.exclude;
  let score = Math.min(15, Math.log2(find.loveCount + 1) * 3);
  if ((travel.endpointFrequency.get(find.stationId) ?? 0) >= 2) score += EXPLORE_SCORE.frequentEndpoint;
  if (travel.recentEndpoints.has(find.stationId)) score += EXPLORE_SCORE.recentEndpoint;
  if (travel.routeStations.has(find.stationId)) score += EXPLORE_SCORE.routeStation;
  if ((preferences.loved.get(find.category) ?? 0) > 0) score += EXPLORE_SCORE.lovedCategory;
  if ((preferences.saved.get(find.category) ?? 0) >= 2) score += EXPLORE_SCORE.savedCategory;
  if (find.authorType === "veyro_team") score += EXPLORE_SCORE.curated;
  if (!travel.usedEndpoints.has(find.stationId)) score += EXPLORE_SCORE.newStation;
  if (interaction?.visited) score += EXPLORE_SCORE.visited;
  if ((preferences.notForMe.get(find.category) ?? 0) >= 2) score += EXPLORE_SCORE.notForMeCategory;
  const published = find.publishedAt instanceof Date ? find.publishedAt : find.publishedAt?.toDate();
  if (published && now.getTime() - published.getTime() <= 45 * 86_400_000) score += EXPLORE_SCORE.recent;
  return Math.round(score * 100) / 100;
}
