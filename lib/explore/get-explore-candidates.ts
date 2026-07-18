import type { ExploreFind } from "@/lib/explore/types";

export function mergeExploreCandidates(...pools: readonly ExploreFind[][]): ExploreFind[] {
  const merged = new Map<string, ExploreFind>();
  for (const pool of pools) for (const find of pool) merged.set(find.id, find);
  return [...merged.values()];
}
