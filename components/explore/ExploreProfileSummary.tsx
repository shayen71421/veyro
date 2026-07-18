"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, CheckCircle2, Compass, Heart, ShieldCheck } from "lucide-react";
import { getInteractions } from "@/lib/explore/queries";
import { isExploreAdmin } from "@/lib/explore/admin-service";
import { calculateExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";
import { syncExploreEligibility } from "@/lib/explore/eligibility-service";
import type { ExploreInteraction } from "@/lib/explore/types";
import type { Journey } from "@/types";

export function ExploreProfileSummary({ uid, journeys, compact = false }: { uid: string; journeys: Journey[]; compact?: boolean }) {
  const [interactions, setInteractions] = useState<Map<string, ExploreInteraction>>(new Map());
  const [admin, setAdmin] = useState(false);
  useEffect(() => { void Promise.all([getInteractions(uid), isExploreAdmin(uid), syncExploreEligibility(uid)]).then(([items, enabled]) => { setInteractions(items); setAdmin(enabled); }).catch(() => undefined); }, [uid]);
  const values = useMemo(() => [...interactions.values()], [interactions]);
  const eligibility = useMemo(() => calculateExplorerEligibility(journeys), [journeys]);
  return <section className="explore-profile-summary">
    <header><Compass/><div><span className="eyebrow">Veyro Explore</span><h2>{eligibility.eligible ? "Local Explorer unlocked" : "Discover around the metro"}</h2><p>{eligibility.eligible ? "Submit useful Finds for administrator review." : `${eligibility.totalJourneys}/5 journeys · ${eligibility.totalDistanceKm.toFixed(1)}/25 km`}</p></div></header>
    <div className="explore-profile-stats">
      <Link href="/explore/saved/"><Bookmark/><strong>{values.filter((item) => item.saved).length}</strong><span>Saved</span></Link>
      <Link href="/explore/visited/"><CheckCircle2/><strong>{values.filter((item) => item.visited).length}</strong><span>Visited</span></Link>
      <span><Heart/><strong>{values.filter((item) => item.reaction === "loved").length}</strong><span>Loved</span></span>
    </div>
    {!compact && <div className="explore-profile-links"><Link href="/explore/" className="secondary-button">Open Explore <ArrowRight size={17}/></Link>{eligibility.eligible && <Link href="/explore/my-finds/" className="secondary-button">My Finds</Link>}{admin && <Link href="/admin/explore/" className="secondary-button"><ShieldCheck size={17}/>Admin Explore</Link>}</div>}
    <p className="explore-privacy-note">Saves, visits and “Not for Me” choices are private. A metro journey never marks a place visited.</p>
  </section>;
}
