import type { Journey } from "@/types";
export const demoJourneys: Journey[] = [
  { id: "demo-1", ownerUid: "demo-user", fromStationId: "kalamassery", fromStationName: "Kalamassery", toStationId: "vyttila", toStationName: "Vyttila", stationIntervals: 14, distanceKm: 15.9, scannedAt: new Date(2026, 6, 18, 21, 42), createdAt: new Date(2026, 6, 18, 21, 42), ocrConfidence: .93, ticketReference: "demo-safe-reference" },
  { id: "demo-2", ownerUid: "demo-user", fromStationId: "aluva", fromStationName: "Aluva", toStationId: "mg-road", toStationName: "MG Road", stationIntervals: 14, distanceKm: 16.8, scannedAt: new Date(2026, 6, 12, 8, 10), createdAt: new Date(2026, 6, 12, 8, 10), ocrConfidence: .91, ticketReference: "demo-safe-reference-2" },
  { id: "demo-3", ownerUid: "demo-user", fromStationId: "sn-junction", fromStationName: "SN Junction", toStationId: "ernakulam-south", toStationName: "Ernakulam South", stationIntervals: 7, distanceKm: 7.9, scannedAt: new Date(2026, 6, 5, 18, 30), createdAt: new Date(2026, 6, 5, 18, 30), ocrConfidence: .89, ticketReference: "demo-safe-reference-3" },
];
