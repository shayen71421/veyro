import { z } from "zod";

export const publicDisplayNameSchema = z.string().trim().min(2).max(30)
  .regex(/^[\p{L}\p{N} .'-]+$/u, "Use letters, numbers, spaces, apostrophes, periods, or hyphens.");
