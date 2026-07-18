import { buildCategoryPreferences } from "@/lib/explore/build-category-preferences";
import { buildTravelProfile } from "@/lib/explore/build-travel-profile";
import { getRecommendationReason } from "@/lib/explore/get-recommendation-reason";
import { scoreExploreFind } from "@/lib/explore/score-explore-find";
import type { ExploreFind, ExploreInteraction, ScoredExploreFind } from "@/lib/explore/types";
import type { Journey } from "@/types";

const dateValue = (find: ExploreFind) => {
  if (!find.publishedAt) return 0;
  return find.publishedAt instanceof Date ? find.publishedAt.getTime() : find.publishedAt.toDate().getTime();
};

export function rankExploreFinds(finds: readonly ExploreFind[], journeys: readonly Journey[], interactions: readonly ExploreInteraction[]): ScoredExploreFind[] {
  const unique = new Map(finds.map((find) => [find.id, find]));
  const interactionMap = new Map(interactions.map((item) => [item.findId, item]));
  const travel = buildTravelProfile(journeys);
  const preferences = buildCategoryPreferences(interactions, unique);
  return [...unique.values()].map((find) => ({
    find,
    score: scoreExploreFind(find, travel, preferences, interactionMap.get(find.id)),
    reason: getRecommendationReason(find, travel, preferences),
  })).filter((item) => item.score > -1000)
    .sort((a, b) => b.score - a.score || b.find.loveCount - a.find.loveCount || dateValue(b.find) - dateValue(a.find) || a.find.id.localeCompare(b.find.id));
}
