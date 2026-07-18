"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { RouteLine } from "@/components/journeys/route-line";
import { useScannerStore } from "@/features/scanner/scanner-context";

export default function VerifyPage() {
  const store = useScannerStore();
  const router = useRouter();
  const route = store.route;

  if (!route) {
    return <AppShell><section className="page center">
      <h1>No verified ticket</h1>
      <p className="muted mt-2">Scan a ticket to verify its route.</p>
      <button className="primary-button mt-6" onClick={() => router.replace("/scan/")}>Open scanner</button>
    </section></AppShell>;
  }

  return <AppShell><section className="page verification">
    <div className="verified-icon"><CheckCircle2/></div>
    <span className="eyebrow">Ticket verified</span>
    <h1>{route.from.name} <span>→</span> {route.to.name}</h1>
    <RouteLine/>
    <p className="confidence">{route.confidence >= .88 ? "Route text is very clear" : "Route text is clear enough to verify"}</p>
    <div className="sticky-actions">
      <button className="secondary-button" onClick={() => {
        store.clearScan();
        router.replace("/scan/");
      }}><RotateCcw size={18}/>Scan Again</button>
    </div>
  </section></AppShell>;
}
