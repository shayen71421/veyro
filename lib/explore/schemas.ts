import { z } from "zod";
import { bestTimeOptions, costTypes, environmentTypes, exploreCategories } from "@/lib/explore/types";

const plainText = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum)
  .refine((value) => !/[<>]/u.test(value), "HTML is not allowed");
const noContactOrPromotion = (value: string) =>
  !/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/iu.test(value)
  && !/(?:\+?\d[\d\s().-]{7,}\d)/u.test(value)
  && !/\b(?:coupon|promo|referral)\s*(?:code)?\b/iu.test(value);

export const KOCHI_BOUNDS = { minLatitude: 9.85, maxLatitude: 10.2, minLongitude: 76.2, maxLongitude: 76.45 } as const;

export const createFindInputSchema = z.object({
  title: plainText(3, 70),
  stationId: z.string().min(1).max(60),
  description: plainText(30, 500).refine(noContactOrPromotion, "Contact details and promotions are not allowed"),
  category: z.enum(exploreCategories),
  walkingMinutes: z.number().int().min(1).max(25),
  walkingTimeType: z.enum(["verified", "estimated"]),
  costType: z.enum(costTypes),
  bestTimes: z.array(z.enum(bestTimeOptions)).max(bestTimeOptions.length),
  environment: z.enum(environmentTypes),
  latitude: z.number().min(KOCHI_BOUNDS.minLatitude).max(KOCHI_BOUNDS.maxLatitude),
  longitude: z.number().min(KOCHI_BOUNDS.minLongitude).max(KOCHI_BOUNDS.maxLongitude),
  mapsLink: z.string().trim().max(500).optional().refine((value) => {
    if (!value) return true;
    try {
      const host = new URL(value).hostname.toLowerCase();
      return ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(host);
    } catch { return false; }
  }, "Use a supported Google Maps link"),
  accessibilityNote: plainText(0, 200).nullable(),
  confirmed: z.literal(true),
}).strict();

const dateLike = z.custom<Date | { toDate(): Date }>((value) =>
  value instanceof Date || (typeof value === "object" && value !== null && "toDate" in value));

export const exploreFindDataSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["pending", "published", "hidden", "rejected", "removed"]),
  title: plainText(3, 70),
  description: plainText(30, 500),
  stationId: z.string().min(1).max(60),
  stationName: plainText(2, 70),
  category: z.enum(exploreCategories),
  walkingMinutes: z.number().int().min(1).max(25),
  walkingTimeType: z.enum(["verified", "estimated"]),
  costType: z.enum(costTypes),
  bestTimes: z.array(z.enum(bestTimeOptions)).max(bestTimeOptions.length),
  environment: z.enum(environmentTypes),
  latitude: z.number().min(KOCHI_BOUNDS.minLatitude).max(KOCHI_BOUNDS.maxLatitude),
  longitude: z.number().min(KOCHI_BOUNDS.minLongitude).max(KOCHI_BOUNDS.maxLongitude),
  accessibilityNote: z.string().max(200).nullable(),
  authorType: z.enum(["veyro_team", "local_explorer"]),
  authorDisplayName: plainText(1, 30),
  authorBadge: z.enum(["Veyro Curated", "Local Explorer"]),
  loveCount: z.number().int().min(0).max(10_000_000),
  seedVersion: z.number().int().min(1).nullable(),
  verifiedAt: dateLike.nullable(),
  createdAt: dateLike,
  updatedAt: dateLike,
  publishedAt: dateLike.nullable(),
}).strict();

export const eligibilitySchema = z.object({
  totalJourneys: z.number().int().min(0).max(100_000),
  totalDistanceKm: z.number().min(0).max(10_000_000),
  eligible: z.boolean(),
  statsVersion: z.literal(1),
  calculatedAt: dateLike,
}).strict();

export const interactionSchema = z.object({
  findId: z.string().min(1).max(120),
  saved: z.boolean(), visited: z.boolean(), hidden: z.boolean(),
  reaction: z.enum(["loved", "not_for_me"]).nullable(),
  firstSeenAt: dateLike.nullable(), savedAt: dateLike.nullable(), visitedAt: dateLike.nullable(),
  reactionAt: dateLike.nullable(), hiddenAt: dateLike.nullable(), updatedAt: dateLike,
}).strict();

export const reportInputSchema = z.object({
  findId: z.string().min(1).max(120),
  reason: z.enum(["place_closed", "incorrect_location", "unsafe_or_restricted", "misleading_description", "advertisement", "private_information", "other"]),
  details: plainText(0, 300).nullable(),
}).strict();

export const moderationActionSchema = z.object({
  findId: z.string().min(1).max(120),
  action: z.enum(["approve", "reject", "hide", "restore", "remove"]),
  message: plainText(0, 300).nullable(),
}).strict().superRefine((value, context) => {
  if (value.action === "reject" && (!value.message || value.message.length < 3)) {
    context.addIssue({ code:"custom", path:["message"], message:"A rejection reason is required" });
  }
});
