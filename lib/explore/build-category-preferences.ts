import type { ExploreCategory, ExploreFind, ExploreInteraction } from "@/lib/explore/types";

export type CategoryPreferences = {
  loved: Map<ExploreCategory, number>;
  saved: Map<ExploreCategory, number>;
  notForMe: Map<ExploreCategory, number>;
  hidden: Map<ExploreCategory, number>;
};

export function buildCategoryPreferences(interactions: readonly ExploreInteraction[], finds: ReadonlyMap<string, ExploreFind>): CategoryPreferences {
  const result: CategoryPreferences = { loved: new Map(), saved: new Map(), notForMe: new Map(), hidden: new Map() };
  for (const interaction of interactions) {
    const category = finds.get(interaction.findId)?.category;
    if (!category) continue;
    const increment = (map: Map<ExploreCategory, number>) => map.set(category, (map.get(category) ?? 0) + 1);
    if (interaction.reaction === "loved") increment(result.loved);
    if (interaction.saved) increment(result.saved);
    if (interaction.reaction === "not_for_me") increment(result.notForMe);
    if (interaction.hidden) increment(result.hidden);
  }
  return result;
}
