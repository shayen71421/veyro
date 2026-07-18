import type { Timestamp } from "firebase/firestore";
import type { KochiMetroStation } from "@/data/kochi-metro-stations";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt?: Timestamp;
  lastSeenAt?: Timestamp;
};

export type Journey = {
  id: string;
  ownerUid: string;
  fromStationId: string;
  fromStationName: string;
  toStationId: string;
  toStationName: string;
  stationIntervals: number;
  distanceKm: number;
  scannedAt: Timestamp | Date;
  ocrConfidence: number;
  ticketReference: string;
  createdAt: Timestamp | Date;
};

export type DetectedRoute = {
  from: KochiMetroStation;
  to: KochiMetroStation;
  confidence: number;
  sourceText?: string;
};

export type ProcessingStep = "qr" | "ocr" | "stations" | "duplicate" | "saving";
