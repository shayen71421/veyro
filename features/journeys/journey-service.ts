import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { createTicketKey, normalizeRawQrValue } from "@/lib/qr/ticket-key";
import { calculateRouteDistance, calculateStationIntervals } from "@/lib/stations/route";
import { stationById } from "@/data/kochi-metro-stations";
import { ticketSubmissionSchema } from "@/lib/validation/schemas";
import type { Journey } from "@/types";

export class JourneyError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const allJourneysCache = new Map<string, Promise<Journey[]>>();

export async function addJourney(input: {
  rawQrValue: string;
  fromStationId: string;
  toStationId: string;
  ocrConfidence: number;
  ownerUid: string;
}): Promise<Omit<Journey, "scannedAt" | "createdAt"> & { scannedAt: Date; createdAt: Date }> {
  const parsed = ticketSubmissionSchema.parse({
    ...input,
    rawQrValue: normalizeRawQrValue(input.rawQrValue),
  });
  let rawQrValue: string | null = parsed.rawQrValue;
  try {
    const client = getFirebaseClient();
    if (!client) throw new JourneyError("FIREBASE_NOT_CONFIGURED");
    const from = stationById.get(parsed.fromStationId);
    const to = stationById.get(parsed.toStationId);
    if (!from || !to) throw new JourneyError("INVALID_ROUTE");
    const ticketKey = createTicketKey(rawQrValue);
    const journeyRef = doc(collection(client.db, "journeys"));
    const claimRef = doc(client.db, "ticketClaims", ticketKey);
    const payloadRef = doc(client.db, "privateTicketPayloads", ticketKey);
    const storedJourney = {
      ownerUid: input.ownerUid,
      fromStationId: from.id,
      fromStationName: from.name,
      toStationId: to.id,
      toStationName: to.name,
      stationIntervals: calculateStationIntervals(from, to),
      distanceKm: calculateRouteDistance(from, to),
      ocrConfidence: parsed.ocrConfidence,
      ticketReference: ticketKey,
    };
    const safe = { id: journeyRef.id, ...storedJourney };
    await runTransaction(client.db, async (transaction) => {
      if ((await transaction.get(claimRef)).exists()) {
        throw new JourneyError("TICKET_ALREADY_USED");
      }
      transaction.set(claimRef, { claimed: true, createdAt: serverTimestamp() });
      transaction.set(payloadRef, {
        rawQrValue,
        ownerUid: input.ownerUid,
        journeyId: journeyRef.id,
        fromStationId: from.id,
        toStationId: to.id,
        scannedAt: serverTimestamp(),
      });
      transaction.set(journeyRef, {
        ...storedJourney,
        scannedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    });
    allJourneysCache.delete(input.ownerUid);
    return { ...safe, scannedAt: new Date(), createdAt: new Date() };
  } finally {
    rawQrValue = null;
  }
}

export async function getJourneys(ownerUid: string, cursor?: DocumentSnapshot, pageSize = 12) {
  const client = getFirebaseClient();
  if (!client) return { journeys: [] as Journey[], cursor: undefined };
  const constraints = [
    where("ownerUid", "==", ownerUid),
    orderBy("scannedAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  ];
  const snapshot = await getDocs(query(collection(client.db, "journeys"), ...constraints));
  return {
    journeys: snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Journey)),
    cursor: snapshot.docs.at(-1),
  };
}

export function getAllJourneys(ownerUid: string): Promise<Journey[]> {
  const cached = allJourneysCache.get(ownerUid);
  if (cached) return cached;

  const request = (async () => {
    const journeys: Journey[] = [];
    let cursor: DocumentSnapshot | undefined;
    do {
      const page = await getJourneys(ownerUid, cursor, 100);
      journeys.push(...page.journeys);
      cursor = page.journeys.length === 100 ? page.cursor : undefined;
    } while (cursor);
    return journeys;
  })().catch((error: unknown) => {
    allJourneysCache.delete(ownerUid);
    throw error;
  });

  allJourneysCache.set(ownerUid, request);
  return request;
}
