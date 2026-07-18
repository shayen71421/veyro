"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { DetectedRoute, Journey, ProcessingStep } from "@/types";

type ScannerContextValue = { route: DetectedRoute | null; previewUrl: string | null; processingStep: ProcessingStep | null;
  result: Journey | null; setResult: (journey: Journey | null) => void;
  setScan: (rawQr: string, route: DetectedRoute, previewUrl: string) => void; getRawQr: () => string | null;
  clearSensitive: () => void; setProcessingStep: (step: ProcessingStep | null) => void; clearScan: () => void };
const ScannerContext = createContext<ScannerContextValue | null>(null);

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const rawQr = useRef<string | null>(null); const [route, setRoute] = useState<DetectedRoute | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [result, setResult] = useState<Journey | null>(null);
  const clearSensitive = useCallback(() => { rawQr.current = null; }, []);
  const clearScan = useCallback(() => { rawQr.current = null; setRoute(null); setProcessingStep(null); setPreviewUrl((old) => { if (old?.startsWith("blob:")) URL.revokeObjectURL(old); return null; }); }, []);
  const setScan = useCallback((raw: string, nextRoute: DetectedRoute, preview: string) => { rawQr.current = raw; setRoute(nextRoute); setPreviewUrl(preview); }, []);
  const value = useMemo(() => ({ route, previewUrl, processingStep, result, setResult, setScan, getRawQr: () => rawQr.current, clearSensitive, setProcessingStep, clearScan }), [route, previewUrl, processingStep, result, setScan, clearSensitive, clearScan]);
  return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
}
export function useScannerStore() { const value = useContext(ScannerContext); if (!value) throw new Error("ScannerProvider missing"); return value; }
