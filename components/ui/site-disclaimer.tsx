import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function SiteDisclaimer({ className }: { className?: string }) {
  return <aside className={cn("site-disclaimer", className)} aria-label="Veyro privacy and independence notice">
    <ShieldCheck size={16} aria-hidden="true"/>
    <p>Source verification records and reports are administrator-only. Traveller recommendations are not official Kochi Metro data.</p>
  </aside>;
}
