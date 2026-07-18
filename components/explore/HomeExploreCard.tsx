"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, MapPin } from "lucide-react";
import { getHomeExploreFinds } from "@/lib/explore/queries";
import type { Journey } from "@/types";
import type { ExploreFind } from "@/lib/explore/types";

export function HomeExploreCard({ journeys }: { journeys: Journey[] }) {
  const [finds, setFinds] = useState<ExploreFind[]>([]);
  useEffect(() => {
    const stations = [...new Set(journeys.flatMap((journey) => [journey.fromStationId, journey.toStationId]))].slice(0, 5);
    void getHomeExploreFinds(stations).then(setFinds).catch(() => undefined);
  }, [journeys]);
  return <section className="home-explore-card">
    <header><span><Compass size={20}/></span><div><span className="eyebrow">Veyro Explore</span><h2>{journeys.length ? "Find something near your routes" : "Explore Kochi by Metro"}</h2></div></header>
    {finds.length ? <div>{finds.map((find) => <Link key={find.id} href={`/explore/find/?id=${encodeURIComponent(find.id)}`}><MapPin size={14}/><span><strong>{find.title}</strong><small>{find.stationName} · {find.walkingMinutes} min walk</small></span><ArrowRight size={15}/></Link>)}</div> : <p>Curated and community Finds around operational metro stations.</p>}
    <Link href="/explore/" className="secondary-button">Open Explore <ArrowRight size={17}/></Link>
  </section>;
}
