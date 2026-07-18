import Link from "next/link";
import { Compass, LockKeyhole } from "lucide-react";
import type { ExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";

export function ExplorerEligibilityCard({ eligibility }: { eligibility: ExplorerEligibility }) {
  return <section className={`explorer-eligibility${eligibility.eligible ? " unlocked" : ""}`}>
    <header><span><Compass size={20}/></span><div><h2>{eligibility.eligible ? "Local Explorer unlocked" : "Become a Local Explorer"}</h2><p>{eligibility.eligible ? "You can now submit useful places around metro stations." : "Complete both travel milestones to submit Veyro Finds."}</p></div></header>
    <div className="eligibility-progress">
      <div><span>{eligibility.totalJourneys} of 5 journeys</span><i><b style={{ width: `${Math.min(100, eligibility.totalJourneys / 5 * 100)}%` }}/></i></div>
      <div><span>{eligibility.totalDistanceKm.toFixed(1)} of 25 km</span><i><b style={{ width: `${Math.min(100, eligibility.totalDistanceKm / 25 * 100)}%` }}/></i></div>
    </div>
    {eligibility.eligible
      ? <Link href="/explore/new/" className="primary-button">Add a Find</Link>
      : <p className="eligibility-note"><LockKeyhole size={14}/>Community Finds are reviewed before publication.</p>}
  </section>;
}
