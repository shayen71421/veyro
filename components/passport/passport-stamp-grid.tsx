"use client";

import { useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { format } from "date-fns";
import gsap from "gsap";
import { kochiMetroStations } from "@/data/kochi-metro-stations";

export function PassportStampGrid({ visitedStationIds, firstVisitedByStation }: {
  visitedStationIds: ReadonlySet<string>;
  firstVisitedByStation: ReadonlyMap<string, Date>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stations = kochiMetroStations.filter((station) => station.operational).sort((a, b) => a.routeOrder - b.routeOrder);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(".passport-stamp.visited", {
        opacity: 0,
        scale: reducedMotion ? 1 : 0.92,
        rotate: reducedMotion ? 0 : -2,
      }, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: reducedMotion ? 0.01 : 0.32,
        stagger: reducedMotion ? 0 : 0.035,
        ease: "back.out(1.4)",
      });
    }, ref);
    return () => context.revert();
  }, [visitedStationIds]);

  return <section className="passport-section" aria-labelledby="station-stamps-title">
    <div className="passport-section-heading">
      <div><span className="eyebrow">Collection</span><h2 id="station-stamps-title">Station stamps</h2></div>
    </div>
    <div ref={ref} className="passport-stamp-grid">
      {stations.map((station) => {
        const visited = visitedStationIds.has(station.id);
        const firstVisited = firstVisitedByStation.get(station.id);
        return <article className={`passport-stamp ${visited ? "visited" : ""}`} key={station.id}>
          <span className="passport-stamp-mark" aria-hidden="true">{visited ? <Check size={17}/> : station.routeOrder + 1}</span>
          <strong>{station.shortName ?? station.name}</strong>
          <small>{visited && firstVisited ? format(firstVisited, "d MMM yyyy") : "Unvisited"}</small>
          <span className="sr-only">{station.name} is {visited ? "visited" : "unvisited"}</span>
        </article>;
      })}
    </div>
  </section>;
}
