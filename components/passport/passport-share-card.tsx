import { format } from "date-fns";
import type { PassportSharePayload } from "@/lib/insights/passport-share";
import { BrandMark } from "@/components/ui/brand-mark";

export function PassportShareCard({ summary }: { summary: PassportSharePayload }) {
  return <article className="passport-share-card" aria-label="Veyro Passport recap preview">
    <header><span className="brand"><BrandMark size={28}/>Veyro</span><span>Travel Passport</span></header>
    <div className="passport-share-hero">
      <span>KOCHI METRO EXPLORER</span>
      <h2>{summary.displayName}</h2>
      <strong>{summary.networkCoveragePercent}%</strong>
      <p>of the network explored</p>
      <div className="passport-share-route" aria-hidden="true"><i/><i/><i/><i/><i/></div>
    </div>
    <div className="passport-share-stats">
      <div><strong>{summary.totalJourneys}</strong><span>journeys</span></div>
      <div><strong>{summary.totalDistanceKm.toFixed(1)}</strong><span>kilometres</span></div>
      <div><strong>{summary.uniqueStationsVisited}</strong><span>stations</span></div>
      <div><strong>{summary.streak}</strong><span>travel streak</span></div>
    </div>
    <footer>
      <span>Favourite stop · {summary.mostVisitedStation ?? "First stamp ahead"}</span>
      <span>{format(new Date(`${summary.generatedOn}T12:00:00`), "MMMM yyyy")}</span>
    </footer>
  </article>;
}
