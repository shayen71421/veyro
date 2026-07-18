"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { MonthlyActivity } from "@/lib/insights/journey-insights";

type Metric = "journeys" | "distance";

export function MonthlyActivityChart({ months }: { months: MonthlyActivity[] }) {
  const [metric, setMetric] = useState<Metric>("journeys");
  const chartRef = useRef<HTMLDivElement>(null);
  const values = months.map((month) => metric === "journeys" ? month.journeyCount : month.distanceKm);
  const maximum = Math.max(...values, 1);

  useLayoutEffect(() => {
    if (!chartRef.current) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".passport-chart-fill",
        { scaleY: reducedMotion ? 1 : 0 },
        { scaleY: 1, duration: reducedMotion ? 0.01 : 0.55, stagger: reducedMotion ? 0 : 0.05, ease: "power2.out" },
      );
    }, chartRef);
    return () => context.revert();
  }, [metric, months]);

  const summary = months.map((month) =>
    `${month.label}: ${metric === "journeys" ? `${month.journeyCount} journeys` : `${month.distanceKm.toFixed(1)} kilometres`}`
  ).join("; ");

  return <section className="passport-section" aria-labelledby="monthly-activity-title">
    <div className="passport-section-heading">
      <div><span className="eyebrow">Last six months</span><h2 id="monthly-activity-title">Monthly activity</h2></div>
      <div className="chart-toggle" aria-label="Activity chart metric">
        <button className={metric === "journeys" ? "active" : ""} aria-pressed={metric === "journeys"} onClick={() => setMetric("journeys")}>Trips</button>
        <button className={metric === "distance" ? "active" : ""} aria-pressed={metric === "distance"} onClick={() => setMetric("distance")}>Km</button>
      </div>
    </div>
    <p className="sr-only">{summary}</p>
    <div ref={chartRef} className="passport-chart" role="img" aria-label={summary}>
      {months.map((month, index) => {
        const value = values[index] ?? 0;
        const height = value === 0 ? 3 : Math.max(12, value / maximum * 100);
        return <div className="passport-chart-column" key={month.key}>
          <span>{metric === "journeys" ? value : value.toFixed(1)}</span>
          <div className="passport-chart-track" aria-hidden="true">
            <i className="passport-chart-fill" style={{ height: `${height}%` }}/>
          </div>
          <small>{month.label}</small>
        </div>;
      })}
    </div>
  </section>;
}
