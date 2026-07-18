import type { CategoryPreferences } from "@/lib/explore/build-category-preferences";
import type { TravelProfile } from "@/lib/explore/build-travel-profile";
import type { ExploreFind } from "@/lib/explore/types";

export function getRecommendationReason(find: ExploreFind, travel: TravelProfile, preferences: CategoryPreferences): string {
  if ((travel.endpointFrequency.get(find.stationId) ?? 0) >= 2) return `Because you often use ${find.stationName}`;
  if (travel.recentEndpoints.has(find.stationId)) return "Near a recent journey";
  if (travel.routeStations.has(find.stationId)) return "Along one of your frequent routes";
  if ((preferences.loved.get(find.category) ?? 0) > 0) return "Similar to places you loved";
  if (find.loveCount >= 5) return "Popular with Veyro travellers";
  if (!travel.usedEndpoints.has(find.stationId)) return "A new station for you";
  if (find.authorType === "veyro_team") return "Veyro Curated";
  return "Recently added";
}
