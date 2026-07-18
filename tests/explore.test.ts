import { describe, expect, it } from "vitest";
import { calculateExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";
import { buildTravelProfile } from "@/lib/explore/build-travel-profile";
import { buildCategoryPreferences } from "@/lib/explore/build-category-preferences";
import { scoreExploreFind, EXPLORE_SCORE } from "@/lib/explore/score-explore-find";
import { rankExploreFinds } from "@/lib/explore/rank-explore-finds";
import { mergeExploreCandidates } from "@/lib/explore/get-explore-candidates";
import { loveDelta } from "@/lib/explore/interactions";
import type { ExploreFind, ExploreInteraction } from "@/lib/explore/types";
import type { Journey } from "@/types";

const journey = (id: string, distanceKm: number, fromStationId = "aluva", toStationId = "edapally", day = 1): Journey => ({
  id, ownerUid:"u", fromStationId, fromStationName:fromStationId, toStationId, toStationName:toStationId,
  stationIntervals:8, distanceKm, scannedAt:new Date(2026, 6, day), ocrConfidence:.9,
  ticketReference:`ticket-${id}-safe`, createdAt:new Date(2026, 6, day),
});
const find = (id: string, stationId = "aluva", category: ExploreFind["category"] = "park", loveCount = 0): ExploreFind => ({
  id, schemaVersion:1, status:"published", title:`Find ${id}`, description:"A sufficiently detailed and safe place description for Explore.",
  stationId, stationName:stationId, category, walkingMinutes:5, walkingTimeType:"estimated",
  costType:"free", bestTimes:["morning"], environment:"outdoor", latitude:10.1, longitude:76.3,
  accessibilityNote:null, authorType:"local_explorer", authorDisplayName:"Asha", authorBadge:"Local Explorer",
  loveCount, seedVersion:null, verifiedAt:null, createdAt:new Date(2026, 6, 1), updatedAt:new Date(2026, 6, 1), publishedAt:new Date(2026, 6, 1),
});
const interaction = (findId: string, change: Partial<ExploreInteraction> = {}): ExploreInteraction => ({
  findId, saved:false, visited:false, hidden:false, reaction:null, firstSeenAt:new Date(),
  savedAt:null, visitedAt:null, reactionAt:null, hiddenAt:null, updatedAt:new Date(), ...change,
});

describe("Local Explorer eligibility", () => {
  it("requires both five journeys and 25 km", () => {
    expect(calculateExplorerEligibility(Array.from({ length:4 }, (_, index) => journey(String(index), 10))).eligible).toBe(false);
    expect(calculateExplorerEligibility(Array.from({ length:5 }, (_, index) => journey(String(index), 4))).eligible).toBe(false);
    expect(calculateExplorerEligibility(Array.from({ length:4 }, (_, index) => journey(String(index), 7))).eligible).toBe(false);
    expect(calculateExplorerEligibility(Array.from({ length:5 }, (_, index) => journey(String(index), 5)))).toMatchObject({ eligible:true, totalJourneys:5, totalDistanceKm:25 });
  });
  it("ignores invalid journey records", () => {
    expect(calculateExplorerEligibility([{ distanceKm:"100" }, null, journey("ok", 5)]).totalJourneys).toBe(1);
  });
});

describe("Explore personalisation", () => {
  it("applies explainable station, route, category, curation and discovery weights", () => {
    const journeys = [journey("1",5), journey("2",5), journey("3",5,"edapally","vyttila")];
    const travel = buildTravelProfile(journeys);
    const target = find("target","aluva","park");
    const prefs = buildCategoryPreferences([interaction("liked",{ visited:true,reaction:"loved" })], new Map([["liked",find("liked","vyttila","park")]]));
    expect(scoreExploreFind(target, travel, prefs)).toBeGreaterThanOrEqual(EXPLORE_SCORE.frequentEndpoint + EXPLORE_SCORE.recentEndpoint + EXPLORE_SCORE.lovedCategory);
    expect(scoreExploreFind({ ...target, id:"curated", stationId:"sn-junction", authorType:"veyro_team", authorBadge:"Veyro Curated" }, travel, prefs)).toBeGreaterThan(EXPLORE_SCORE.curated);
  });
  it("penalises visited and excludes hidden or exact not-for-me Finds", () => {
    const target = find("x"); const travel = buildTravelProfile([]); const prefs = buildCategoryPreferences([], new Map());
    expect(scoreExploreFind(target, travel, prefs, interaction("x",{ visited:true }))).toBeLessThan(scoreExploreFind(target, travel, prefs));
    expect(scoreExploreFind(target, travel, prefs, interaction("x",{ hidden:true }))).toBe(EXPLORE_SCORE.exclude);
    expect(scoreExploreFind(target, travel, prefs, interaction("x",{ visited:true,reaction:"not_for_me" }))).toBe(EXPLORE_SCORE.exclude);
  });
  it("ranks cold starts and ties deterministically and removes duplicate candidates", () => {
    const a = find("a","aluva","park",2); const b = find("b","aluva","park",2);
    expect(rankExploreFinds([b,a],[],[]).map((item) => item.find.id)).toEqual(["a","b"]);
    expect(mergeExploreCandidates([a,b],[a])).toEqual([a,b]);
  });
});

describe("Explore reaction deltas", () => {
  it("increments and decrements love exactly once without a public dislike count", () => {
    expect(loveDelta(null,"loved")).toBe(1);
    expect(loveDelta("not_for_me","loved")).toBe(1);
    expect(loveDelta("loved",null)).toBe(-1);
    expect(loveDelta("loved","not_for_me")).toBe(-1);
    expect(loveDelta("not_for_me",null)).toBe(0);
    expect(Math.max(0, 0 + loveDelta("loved",null))).toBe(0);
  });
});
