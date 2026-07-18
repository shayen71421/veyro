import type { KochiMetroStation } from "@/data/kochi-metro-stations";

export type DetectedRoute = {
  from: KochiMetroStation;
  to: KochiMetroStation;
  confidence: number;
  sourceText?: string;
};

export type ProcessingStep = "qr" | "ocr" | "stations";
