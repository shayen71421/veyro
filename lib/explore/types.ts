import type { Timestamp } from "firebase/firestore";

export const exploreCategories = ["food", "park", "culture", "shopping", "quick_activity", "quiet_spot", "photo_spot", "museum", "recreation", "student_friendly", "useful_service"] as const;
export const costTypes = ["free", "paid", "varies", "unknown"] as const;
export const environmentTypes = ["indoor", "outdoor", "mixed", "unknown"] as const;
export const bestTimeOptions = ["morning", "afternoon", "evening", "night", "weekday", "weekend"] as const;

export type ExploreCategory = typeof exploreCategories[number];
export type CostType = typeof costTypes[number];
export type EnvironmentType = typeof environmentTypes[number];
export type BestTime = typeof bestTimeOptions[number];
export type FindStatus = "pending" | "published" | "hidden" | "rejected" | "removed";
export type ExploreReaction = "loved" | "not_for_me" | null;

export type ExploreFind = {
  id: string;
  schemaVersion: 1;
  status: FindStatus;
  title: string;
  description: string;
  stationId: string;
  stationName: string;
  category: ExploreCategory;
  walkingMinutes: number;
  walkingTimeType: "verified" | "estimated";
  costType: CostType;
  bestTimes: BestTime[];
  environment: EnvironmentType;
  latitude: number;
  longitude: number;
  accessibilityNote: string | null;
  authorType: "veyro_team" | "local_explorer";
  authorDisplayName: string;
  authorBadge: "Veyro Curated" | "Local Explorer";
  loveCount: number;
  seedVersion: number | null;
  verifiedAt: Timestamp | Date | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  publishedAt: Timestamp | Date | null;
};

export type ExploreInteraction = {
  findId: string;
  saved: boolean;
  visited: boolean;
  hidden: boolean;
  reaction: ExploreReaction;
  firstSeenAt: Timestamp | Date | null;
  savedAt: Timestamp | Date | null;
  visitedAt: Timestamp | Date | null;
  reactionAt: Timestamp | Date | null;
  hiddenAt: Timestamp | Date | null;
  updatedAt: Timestamp | Date;
};

export type ScoredExploreFind = {
  find: ExploreFind;
  score: number;
  reason: string;
};

export const categoryLabels: Record<ExploreCategory, string> = {
  food: "Food", park: "Park", culture: "Culture", shopping: "Shopping",
  quick_activity: "Quick Activity", quiet_spot: "Quiet Spot", photo_spot: "Photo Spot",
  museum: "Museum", recreation: "Recreation", student_friendly: "Student Friendly",
  useful_service: "Useful Service",
};

export const costLabels: Record<CostType, string> = {
  free: "Free", paid: "Paid", varies: "Cost varies", unknown: "Check before visiting",
};

export const environmentLabels: Record<EnvironmentType, string> = {
  indoor: "Indoor", outdoor: "Outdoor", mixed: "Indoor & outdoor", unknown: "Check environment",
};

export function mapsUrl(find: Pick<ExploreFind, "latitude" | "longitude">): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${find.latitude},${find.longitude}`)}`;
}
