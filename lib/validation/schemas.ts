import { z } from "zod";

export const ticketSubmissionSchema = z.object({
  rawQrValue: z.string(), fromStationId: z.string().min(1), toStationId: z.string().min(1),
  ocrConfidence: z.number().min(0.72).max(1),
}).refine((value) => value.fromStationId !== value.toStationId, "Stations must differ");

export const publicDisplayNameSchema = z.string().trim().min(2).max(30)
  .regex(/^[\p{L}\p{N} .'-]+$/u, "Use letters, numbers, spaces, apostrophes, periods, or hyphens.");
