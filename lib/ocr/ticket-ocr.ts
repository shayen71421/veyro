import { createWorker, OEM, PSM } from "tesseract.js";
import { kochiMetroStations } from "@/data/kochi-metro-stations";
import { matchStationName, normalizeStationText, validateDetectedRoute } from "@/lib/stations/route";

export const OCR_CONFIDENCE_THRESHOLD = Number(process.env.NEXT_PUBLIC_OCR_CONFIDENCE_THRESHOLD ?? 0.72);

export async function preprocessTicketImage(source: CanvasImageSource): Promise<HTMLCanvasElement> {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source instanceof HTMLImageElement ? source.naturalWidth :
    "displayWidth" in source ? source.displayWidth : "width" in source ? Number(source.width) : 0;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source instanceof HTMLImageElement ? source.naturalHeight :
    "displayHeight" in source ? source.displayHeight : "height" in source ? Number(source.height) : 0;
  if (!width || !height) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
  const scale = Math.min(3, Math.max(1, 1500 / width));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("IMAGE_PROCESSING_UNAVAILABLE");
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    image.data[i] = contrasted; image.data[i + 1] = contrasted; image.data[i + 2] = contrasted;
  }
  context.putImageData(image, 0, 0); return canvas;
}

const tidy = (value: string) => value.replace(/[|_[\]{}]/gu, " ").replace(/\s+/gu, " ").trim();

export function extractPaperTicketRoute(text: string): { from: string; to: string } | null {
  const from = text.match(/\bfrom\s*[:\-]?\s*([^\n\r]{2,40})/iu)?.[1];
  const to = text.match(/\bto\s*[:\-]?\s*([^\n\r]{2,40})/iu)?.[1];
  return from && to ? { from: tidy(from), to: tidy(to) } : null;
}

export function extractMobileTicketRoute(text: string): { from: string; to: string } | null {
  for (const line of text.split(/\r?\n/u)) {
    const parts = line.split(/\s*(?:→|->|>|\bTO\b)\s*/iu);
    if (parts.length === 2 && parts[0].trim().length > 1 && parts[1].trim().length > 1) return { from: tidy(parts[0]), to: tidy(parts[1]) };
  }
  return null;
}

/**
 * Mobile tickets often use a graphical arrow. Tesseract can then return the
 * two station labels on separate lines, so recover their visual text order
 * from known station names rather than requiring an OCR-produced arrow.
 */
export function extractKnownStationRoute(text: string): { from: string; to: string } | null {
  const normalized = normalizeStationText(text);
  const matches = kochiMetroStations.flatMap((station) => {
    const aliases = [station.name, station.shortName ?? "", ...station.aliases]
      .map(normalizeStationText).filter((alias) => alias.length >= 5);
    const indexes = aliases.map((alias) => normalized.indexOf(alias)).filter((index) => index >= 0);
    return indexes.length ? [{ station, index: Math.min(...indexes) }] : [];
  }).sort((a, b) => a.index - b.index);
  const unique = matches.filter((match, index) => matches.findIndex((item) => item.station.id === match.station.id) === index);
  if (unique.length >= 2) return { from: unique[0].station.name, to: unique[1].station.name };

  const lineMatches = text.split(/\r?\n/u).flatMap((line) => {
    const candidate = tidy(line.replace(/^\s*(?:from|to)\s*[:\-]?\s*/iu, ""));
    const match = matchStationName(candidate);
    return match ? [match.station] : [];
  }).filter((station, index, stations) => stations.findIndex((item) => item.id === station.id) === index);
  return lineMatches.length >= 2 ? { from: lineMatches[0].name, to: lineMatches[1].name } : null;
}

function cropRegion(source: HTMLCanvasElement, leftRatio: number, topRatio: number, widthRatio: number, heightRatio: number): HTMLCanvasElement {
  const sourceX = Math.round(source.width * leftRatio); const sourceY = Math.round(source.height * topRatio);
  const sourceWidth = Math.round(source.width * widthRatio); const sourceHeight = Math.round(source.height * heightRatio);
  const canvas = document.createElement("canvas"); canvas.width = sourceWidth; canvas.height = sourceHeight;
  canvas.getContext("2d")?.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  return canvas;
}

export async function readTicketRoute(canvas: HTMLCanvasElement, onStatus?: (status: string) => void) {
  let lastStatus = "";
  const worker = await createWorker("eng", OEM.LSTM_ONLY, { logger: (message) => {
    if (message.status !== lastStatus) { lastStatus = message.status; onStatus?.(message.status); }
  } });
  const regions = [
    cropRegion(canvas, 0, 0, 1, .48),
    cropRegion(canvas, 0, .08, 1, .66),
    cropRegion(canvas, 0, .22, 1, .65),
    canvas,
  ];
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: "1", user_defined_dpi: "300" });
    for (const region of regions) {
      const result = await worker.recognize(region);
      const route = extractPaperTicketRoute(result.data.text) ?? extractMobileTicketRoute(result.data.text) ?? extractKnownStationRoute(result.data.text);
      if (!route) continue;
      const rawConfidence = Math.max(0, Math.min(1, result.data.confidence / 100));
      const stationConfidence = Math.min(matchStationName(route.from)?.score ?? 0, matchStationName(route.to)?.score ?? 0);
      const confidence = rawConfidence * .65 + stationConfidence * .35;
      const validated = validateDetectedRoute(route.from, route.to, confidence, OCR_CONFIDENCE_THRESHOLD);
      if (validated) return validated;
    }
    return null;
  } finally { for (const region of regions.filter((region) => region !== canvas)) { region.width = 1; region.height = 1; } await worker.terminate(); }
}
