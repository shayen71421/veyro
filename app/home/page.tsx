"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, ScanLine, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { StatCard } from "@/components/journeys/stat-card";
import { JourneyCard } from "@/components/journeys/journey-card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { demoJourneys } from "@/features/journeys/demo-data";
import type { Journey } from "@/types";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";
import { calculateJourneyInsights } from "@/lib/insights/journey-insights";
import { HomeLeaderboardCard } from "@/components/leaderboard/home-leaderboard-card";
import { HomeExploreCard } from "@/components/explore/HomeExploreCard";

export default function HomePage() {
  const { user, demo, displayName, photoURL } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>(demo ? demoJourneys : []);
  const [loading, setLoading] = useState(!demo); const ref = useRef<HTMLElement>(null);
  useGsapEntrance(ref);
  useEffect(() => {
    if (!user || demo) return;
    void getAllJourneys(user.uid).then((next) => setJourneys(next)).finally(() => setLoading(false));
  }, [user, demo]);
  const insights = useMemo(() => calculateJourneyInsights(journeys), [journeys]);
  const hour = new Date().getHours(); const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <AppShell><section ref={ref} className="page">
    <header className="page-header" data-animate><div><span className="eyebrow">Your metro journal</span><h1>{greeting}, {displayName.split(" ")[0] ?? "rider"}</h1><p className="page-header-note">Every ride leaves a mark.</p></div><div className="page-header-actions"><Link href="/leaderboard/" className="icon-button" aria-label="Open community leaderboard"><Trophy size={19}/></Link><ProfileAvatar displayName={displayName} photoURL={photoURL}/></div></header>
    <div className="stats-grid">{loading ? <><LoadingSkeleton/><LoadingSkeleton/></> : <><StatCard value={insights.totalJourneys} label="journeys"/><StatCard value={`${insights.totalDistanceKm.toFixed(1)} km`} label="travelled"/></>}</div>
    <Link href="/scan/" className="scan-cta" data-animate><span><small>One scan. One story.</small><strong>Scan Metro Ticket</strong></span><i><ScanLine/></i></Link>
    {!loading && <section className="passport-summary" data-animate aria-labelledby="home-passport-title">
      <div className="passport-summary-header"><div><span className="eyebrow">Travel collection</span><h2 id="home-passport-title">Veyro Passport</h2></div><BookOpenCheck/></div>
      <div className="passport-summary-stats">
        <div><strong>{insights.uniqueStationsVisited}</strong><span>stations stamped</span></div>
        <div><strong>{insights.networkCoveragePercent}%</strong><span>network explored</span></div>
        <div><strong>{insights.currentStreak}</strong><span>day streak</span></div>
      </div>
      <Link href="/passport/" className="secondary-button">View Passport <ArrowRight size={17}/></Link>
    </section>}
    {!loading && <HomeExploreCard journeys={journeys}/>}
    <HomeLeaderboardCard/>
    <section className="section-block"><div className="section-title" data-animate><h2>Recent journeys</h2><Link href="/journeys/">View all</Link></div>
      {loading ? <div className="stack"><LoadingSkeleton className="h-28"/><LoadingSkeleton className="h-28"/></div> : journeys.length ? <div className="stack">{journeys.slice(0,3).map((journey) => <JourneyCard key={journey.id} journey={journey}/>)}</div> : <p className="muted">Your first journey is one scan away.</p>}
    </section>
  </section></AppShell>;
}
