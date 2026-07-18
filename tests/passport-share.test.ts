import { describe, expect, it } from "vitest";
import {
  decodePassportSharePayload,
  encodePassportSharePayload,
  passportShareSchema,
  type PassportSharePayload,
} from "@/lib/insights/passport-share";

const payload: PassportSharePayload = {
  v: 1,
  displayName: "Shayen Thomas",
  totalJourneys: 8,
  totalDistanceKm: 74.5,
  uniqueStationsVisited: 11,
  networkCoveragePercent: 44,
  streak: 3,
  mostVisitedStation: "Aluva",
  generatedOn: "2026-07-17",
};

describe("Passport share links", () => {
  it("round-trips a privacy-safe recap payload", () => {
    expect(decodePassportSharePayload(encodePassportSharePayload(payload))).toEqual(payload);
  });

  it("supports UTF-8 public display names", () => {
    const encoded = encodePassportSharePayload({ ...payload, displayName: "ഷയൻ" });
    expect(decodePassportSharePayload(encoded)?.displayName).toBe("ഷയൻ");
  });

  it("rejects malformed or out-of-range payloads", () => {
    expect(decodePassportSharePayload("not-valid-encoded-json")).toBeNull();
    expect(passportShareSchema.safeParse({ ...payload, networkCoveragePercent: 140 }).success).toBe(false);
  });

  it("contains no private ticket or account identifiers", () => {
    expect(Object.keys(payload)).not.toEqual(expect.arrayContaining([
      "email", "uid", "rawQrValue", "ticketReference", "journeyId",
    ]));
  });
});
