"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { getFindsNearStation } from "@/lib/explore/queries";
import { ExploreFindCard } from "@/components/explore/ExploreFindCard";
import type { ExploreFind } from "@/lib/explore/types";

export function DestinationFinds({ stationId, stationName }: { stationId: string; stationName: string }) {
  const [finds, setFinds] = useState<ExploreFind[]>([]);
  useEffect(() => { void getFindsNearStation(stationId, 3).then(setFinds).catch(() => undefined); }, [stationId]);
  return <section className="destination-finds"><header><Compass/><div><span className="eyebrow">Plan a future experience</span><h2>Explore near {stationName}</h2><p>These suggestions do not mean you visited them.</p></div></header>{finds.length ? <div className="explore-card-list">{finds.map((find) => <ExploreFindCard key={find.id} find={find} compact/>)}</div> : <p className="muted">No published Finds are available near this station yet.</p>}<Link href="/explore/" className="secondary-button">Explore Kochi</Link></section>;
}
