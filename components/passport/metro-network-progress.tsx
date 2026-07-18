"use client";

import { useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { format } from "date-fns";
import gsap from "gsap";
import { kochiMetroStations } from "@/data/kochi-metro-stations";

export function MetroNetworkProgress({ visitedStationIds, firstVisitedByStation }: {
  visitedStationIds: ReadonlySet<string>;
  firstVisitedByStation: ReadonlyMap<string, Date>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stations = kochiMetroStations.filter((station) => station.operational).sort((a, b) => a.routeOrder - b.routeOrder);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(".passport-network-line", { scaleY: reducedMotion ? 1 : 0 }, {
        scaleY: 1, duration: reducedMotion ? 0.01 : 1, ease: "power2.inOut",
      });
      gsap.fromTo(".station-stop.visited .station-node", { opacity: 0, scale: reducedMotion ? 1 : 0.45 }, {
        opacity: 1, scale: 1, duration: reducedMotion ? 0.01 : 0.3, stagger: reducedMotion ? 0 : 0.035, delay: reducedMotion ? 0 : 0.25,
      });
    }, ref);
    return () => context.revert();
  }, [visitedStationIds]);

  return <section className="passport-section" aria-labelledby="network-progress-title">
    <div className="passport-section-heading">
      <div><span className="eyebrow">Line 1</span><h2 id="network-progress-title">Metro network progress</h2></div>
      <span className="station-total">{visitedStationIds.size}/{stations.length}</span>
    </div>
    <div ref={ref} className="passport-network-list">
      <i className="passport-network-line" aria-hidden="true"/>
      {stations.map((station) => {
        const visited = visitedStationIds.has(station.id);
        const firstVisited = firstVisitedByStation.get(station.id);
        return <div
          key={station.id}
          className={`station-stop ${visited ? "visited" : "unvisited"}`}
          role="group"
          aria-label={`${station.name}: ${visited ? `visited${firstVisited ? ` first on ${format(firstVisited, "d MMMM yyyy")}` : ""}` : "not visited"}`}
        >
          <span className="station-node" aria-hidden="true">{visited && <Check size={13}/>}</span>
          <span className="station-stop-copy">
            <strong>{station.name}</strong>
            <small>{visited && firstVisited ? `First stamp · ${format(firstVisited, "d MMM yyyy")}` : "Not yet stamped"}</small>
          </span>
        </div>;
      })}
    </div>
  </section>;
}
