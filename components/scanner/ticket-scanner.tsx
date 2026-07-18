"use client";

import { useCallback, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, ImagePlus, RefreshCcw, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { preprocessTicketImage, readTicketRoute } from "@/lib/ocr/ticket-ocr";
import { normalizeRawQrValue } from "@/lib/qr/ticket-key";
import { useScannerStore } from "@/features/scanner/scanner-context";
import { ErrorMessage } from "@/components/ui/error-message";
import { validateDetectedRoute } from "@/lib/stations/route";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";

type DetectedBarcode = { rawValue: string; format?: string };
type NativeBarcodeDetector = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type NativeBarcodeDetectorConstructor = new (options: { formats: string[] }) => NativeBarcodeDetector;
type QrCrop = { x: number; y: number; width: number; height: number };

function scannerLog(stage: string, details: Record<string, string | number | boolean> = {}) {
  if (process.env.NODE_ENV !== "production") console.info("[Veyro scanner]", { stage, ...details });
}

function drawScaledImage(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, maxLongEdge = 2200) {
  const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CAPTURE_FAILED");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createThresholdCanvas(source: HTMLCanvasElement, crop: QrCrop, threshold = 160) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("CAPTURE_FAILED");

  context.drawImage(
    source,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = (
      image.data[index] * 0.299
      + image.data[index + 1] * 0.587
      + image.data[index + 2] * 0.114
    );
    const value = luminance >= threshold ? 255 : 0;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function getQrFallbackCanvases(source: HTMLCanvasElement) {
  const fullCrop = { x: 0, y: 0, width: source.width, height: source.height };
  const squareSize = Math.round(Math.min(source.width, source.height) * 0.8);
  const horizontalSpace = Math.max(0, source.width - squareSize);
  const verticalSpace = Math.max(0, source.height - squareSize);
  const squareCrops = source.height >= source.width
    ? [
        { x: horizontalSpace / 2, y: verticalSpace / 2, width: squareSize, height: squareSize },
        { x: horizontalSpace / 2, y: 0, width: squareSize, height: squareSize },
        { x: horizontalSpace / 2, y: verticalSpace, width: squareSize, height: squareSize },
      ]
    : [
        { x: horizontalSpace / 2, y: verticalSpace / 2, width: squareSize, height: squareSize },
        { x: 0, y: verticalSpace / 2, width: squareSize, height: squareSize },
        { x: horizontalSpace, y: verticalSpace / 2, width: squareSize, height: squareSize },
      ];

  return [
    source,
    createThresholdCanvas(source, fullCrop),
    ...squareCrops.map((crop) => createThresholdCanvas(source, crop)),
  ];
}

async function detectQrValue(source: HTMLCanvasElement): Promise<string> {
  const working = drawScaledImage(source, source.width, source.height, 1500);
  try {
    const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: NativeBarcodeDetectorConstructor }).BarcodeDetector;
    if (Detector) {
      scannerLog("qr-native-start", { width: working.width, height: working.height });
      try {
        const detector = new Detector({ formats: ["qr_code"] });
        const barcodes = await Promise.race([
          detector.detect(working),
          new Promise<DetectedBarcode[]>((_, reject) => setTimeout(() => reject(new Error("QR_NATIVE_TIMEOUT")), 12000)),
        ]);
        const qr = barcodes.find((barcode) => !barcode.format || barcode.format === "qr_code");
        if (qr?.rawValue) {
          scannerLog("qr-native-success");
          return qr.rawValue;
        }
        scannerLog("qr-native-empty");
      } catch (error) {
        scannerLog("qr-native-failed", { kind: error instanceof Error ? error.name : "unknown" });
      }
    } else {
      scannerLog("qr-native-unavailable");
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const fallback = drawScaledImage(working, working.width, working.height, 1200);
    const hints = new Map<DecodeHintType, BarcodeFormat[] | boolean>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserQRCodeReader(hints);
    const candidates = getQrFallbackCanvases(fallback);
    try {
      scannerLog("qr-zxing-start", {
        width: fallback.width,
        height: fallback.height,
        attempts: candidates.length,
      });
      for (let index = 0; index < candidates.length; index += 1) {
        try {
          const value = reader.decodeFromCanvas(candidates[index]).getText();
          scannerLog("qr-zxing-success", { attempt: index + 1 });
          return value;
        } catch {
          // Try the next privacy-safe in-memory contrast/crop variant.
        }
      }
      throw new Error("QR_NOT_FOUND");
    } finally {
      for (const candidate of candidates) {
        if (candidate !== fallback) {
          candidate.width = 1;
          candidate.height = 1;
        }
      }
      fallback.width = 1;
      fallback.height = 1;
    }
  } finally {
    working.width = 1;
    working.height = 1;
  }
}

export function TicketScanner() {
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState("Choose how to add your ticket photo");
  const router = useRouter();
  const store = useScannerStore();
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const pageRef = useRef<HTMLElement>(null);
  useGsapEntrance(pageRef);

  const processCanvas = useCallback(async (canvas: HTMLCanvasElement, rawInput?: string) => {
    setProcessing(true);
    setScannerStatus("Scanning QR…");
    store.setProcessingStep("qr");
    let rawQr: string | null = null;
    scannerLog("process-start", { width: canvas.width, height: canvas.height });
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      rawQr = normalizeRawQrValue(rawInput ?? await detectQrValue(canvas));
      scannerLog("qr-complete");
      setScannerStatus("QR detected. Preparing OCR…");
      store.setProcessingStep("ocr");

      const preprocessed = await preprocessTicketImage(canvas);
      scannerLog("image-preprocessed", { width: preprocessed.width, height: preprocessed.height });
      setScannerStatus("Reading route text…");
      const route = await readTicketRoute(preprocessed, (status) => {
        scannerLog("ocr-worker", { status });
        if (status.includes("loading")) setScannerStatus("Loading OCR reader…");
        else if (status.includes("recognizing")) setScannerStatus("Reading route text…");
      });
      preprocessed.width = 1;
      preprocessed.height = 1;
      setScannerStatus("Validating stations…");
      store.setProcessingStep("stations");
      if (!route) throw new Error("ROUTE_UNREADABLE");

      scannerLog("route-validated");
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("CAPTURE_FAILED")), "image/jpeg", .82);
      });
      const previewUrl = URL.createObjectURL(blob);
      store.setScan(rawQr, route, previewUrl);
      rawQr = null;
      canvas.width = 1;
      canvas.height = 1;
      router.push("/scan/verify/");
    } catch (caught) {
      scannerLog("process-failed", { kind: caught instanceof Error ? caught.name : "unknown" });
      rawQr = null;
      setFrozenFrame(null);
      setProcessing(false);
      setScannerStatus("Choose how to add your ticket photo");
      store.setProcessingStep(null);
      setError(caught instanceof Error && caught.message === "ROUTE_UNREADABLE"
        ? "We could not clearly verify the route. Make sure the complete ticket, QR, From station, and To station are visible."
        : "No valid QR was found. Choose a clear image showing the complete ticket.");
    }
  }, [router, store]);

  const processTicketPhoto = async (file?: File) => {
    if (!file || processing) return;
    setError("");
    setFrozenFrame(null);
    setProcessing(true);
    setScannerStatus("Preparing photo…");
    store.setProcessingStep("qr");
    scannerLog("photo-selected", { type: file.type || "unknown", sizeKb: Math.round(file.size / 1024) });

    const image = new Image();
    image.decoding = "async";
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const canvas = drawScaledImage(image, image.naturalWidth, image.naturalHeight);
        scannerLog("photo-decoded", {
          sourceWidth: image.naturalWidth,
          sourceHeight: image.naturalHeight,
          width: canvas.width,
          height: canvas.height,
        });
        setFrozenFrame(canvas.toDataURL("image/jpeg", .72));
        URL.revokeObjectURL(url);
        void processCanvas(canvas);
      } catch {
        URL.revokeObjectURL(url);
        setProcessing(false);
        store.setProcessingStep(null);
        setError("This photo was too large to process. Try a smaller image.");
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setProcessing(false);
      store.setProcessingStep(null);
      setError("This image format could not be opened. Use a JPEG, PNG, or WebP image.");
    };
    image.src = url;
  };

  const simulate = (mode: "success" | "duplicate" | "unreadable") => {
    if (mode === "unreadable") {
      setError("We could not clearly verify the route. Choose another image.");
      return;
    }
    const route = validateDetectedRoute("Changampuzha Park", "Aluva", .94);
    if (!route) return;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#efece3";
      context.fillRect(0, 0, 600, 900);
      context.fillStyle = "#172622";
      context.font = "32px sans-serif";
      context.fillText("From: Changampuzha Park", 70, 280);
      context.fillText("To: Aluva", 70, 340);
    }
    store.setScan(
      mode === "duplicate" ? "VEYRO-DEMO-DUPLICATE-001" : `VEYRO-DEMO-${Date.now()}`,
      route,
      canvas.toDataURL("image/jpeg"),
    );
    router.push("/scan/verify/");
  };

  const handleInput = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    void processTicketPhoto(file);
  };

  return <div className="photo-entry-screen">
    <header className="photo-entry-header">
      <button className="icon-button" onClick={() => { store.clearScan(); router.push("/home/"); }} aria-label="Close"><X/></button>
      <span>Add metro ticket</span>
      <span className="icon-spacer"/>
    </header>

    {processing ? <main ref={pageRef} className="photo-processing" aria-live="polite">
      {frozenFrame
        // This is an in-memory preview only and is never uploaded or persisted.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={frozenFrame} alt="" className="selected-ticket-preview" data-animate/>
        : <div className="selected-ticket-placeholder" data-animate><ImagePlus/></div>}
      <RefreshCcw className="animate-spin text-accent" size={30} data-animate/>
      <h1 data-animate>{scannerStatus}</h1>
      <p data-animate>The QR and route are being read on this device. The photo is never uploaded.</p>
    </main> : <main ref={pageRef} className="photo-entry-content">
      <div className="photo-entry-icon" data-animate><ImagePlus size={34}/></div>
      <span className="eyebrow" data-animate>One photo. One journey.</span>
      <h1 data-animate>Add a ticket photo</h1>
      <p className="muted" data-animate>The complete ticket must be visible, including its QR code and both station names.</p>

      {error && <ErrorMessage message={error}/>}

      <div className="photo-choice-list" data-animate>
        <label className="photo-choice primary">
          <Camera size={25}/>
          <span><strong>Take photo</strong><small>Open your phone camera</small></span>
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => handleInput(event.currentTarget)}/>
        </label>
        <label className="photo-choice">
          <ImagePlus size={25}/>
          <span><strong>Choose image</strong><small>Select an existing ticket photo</small></span>
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleInput(event.currentTarget)}/>
        </label>
      </div>

      <div className="photo-privacy" data-animate><ShieldCheck size={18}/><span>Images remain in browser memory and are cleared after processing.</span></div>

      {demo && <div className="demo-controls">
        <span>Development demo</span>
        <button onClick={() => simulate("success")}>Successful scan</button>
        <button onClick={() => simulate("duplicate")}>Duplicate</button>
        <button onClick={() => simulate("unreadable")}>Unreadable</button>
      </div>}
    </main>}
  </div>;
}
