"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, Check, Flame, Link2, MapPinned, Share2, Sparkles, TrainFront } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { MonthlyActivityChart } from "@/components/passport/monthly-activity-chart";
import { MetroNetworkProgress } from "@/components/passport/metro-network-progress";
import { PassportStampGrid } from "@/components/passport/passport-stamp-grid";
import { PassportShareCard } from "@/components/passport/passport-share-card";
import { LeaderboardRanksCard } from "@/components/leaderboard/leaderboard-ranks-card";
import { ExploreProfileSummary } from "@/components/explore/ExploreProfileSummary";
import { useAuth } from "@/features/auth/auth-context";
import { demoJourneys } from "@/features/journeys/demo-data";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { calculateJourneyInsights } from "@/lib/insights/journey-insights";
import { createPassportSharePayload, encodePassportSharePayload } from "@/lib/insights/passport-share";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";
import type { Journey } from "@/types";

function routeLabel(from: string, to: string) {
  return `${from} → ${to}`;
}

export default function PassportPage() {
  const { user, demo, displayName, photoURL } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>(demo ? demoJourneys : []);
  const [loading, setLoading] = useState(!demo);
  const [loadError, setLoadError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [shareError, setShareError] = useState("");
  const pageRef = useRef<HTMLElement>(null);
  const generatedOn = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const insights = useMemo(() => calculateJourneyInsights(journeys), [journeys]);
  const shareSummary = useMemo(
    () => createPassportSharePayload(displayName, insights, generatedOn),
    [displayName, insights, generatedOn],
  );
  useGsapEntrance(pageRef);

  useEffect(() => {
    if (!user || demo) return;
    let active = true;
    void getAllJourneys(user.uid)
      .then((next) => { if (active) setJourneys(next); })
      .catch(() => { if (active) setLoadError("We could not load your Passport. Check your connection and try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, demo]);

  const sharePassport = async () => {
    if (sharing) return;
    setSharing(true);
    setShareError("");
    setShareStatus("");
    try {
      const shareUrl = `${window.location.origin}/passport/share/#${encodePassportSharePayload(shareSummary)}`;
      if (navigator.share) {
        await navigator.share({ title: "My Veyro Passport", text: "Explore my Kochi Metro travel recap.", url: shareUrl });
      } else {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.select();
          const copied = document.execCommand("copy");
          textArea.remove();
          if (!copied) throw new Error("COPY_FAILED");
        }
        setShareStatus("Passport link copied.");
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setShareError("We could not share your Passport link. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  if (loading) return <AppShell><section className="page passport-page" aria-busy="true">
    <LoadingSkeleton className="passport-header-skeleton"/>
    <div className="passport-stats-grid mt-4">{Array.from({ length: 4 }, (_, index) => <LoadingSkeleton className="h-24" key={index}/>)}</div>
    <LoadingSkeleton className="passport-content-skeleton mt-4"/>
  </section></AppShell>;

  if (!insights.totalJourneys) return <AppShell><section ref={pageRef} className="page passport-empty">
    <div className="passport-empty-line" data-animate aria-hidden="true">
      <i/><i/><i/><TrainFront/>
    </div>
    <span className="eyebrow" data-animate>Veyro Passport</span>
    <h1 data-animate>Your Veyro Passport is waiting for its first stamp.</h1>
    <p className="muted" data-animate>Scan a valid ticket to stamp its origin and destination stations and begin exploring the network.</p>
    {loadError && <ErrorMessage message={loadError}/>}
    <Link href="/scan/" className="primary-button" data-animate>Scan First Ticket <ArrowRight size={18}/></Link>
  </section></AppShell>;

  const longestRide = insights.longestJourneyByDistance;
  const mostCommonRoute = insights.mostCommonRoute;
  const memberSince = insights.firstJourneyDate ? format(insights.firstJourneyDate, "MMMM yyyy") : "Your first stamp";

  return <AppShell><section ref={pageRef} className="page passport-page">
    <header className="passport-header" data-animate>
      <div className="passport-header-top">
        <div><span className="eyebrow">Personal travel record</span><h1>Veyro Passport</h1></div>
        <ProfileAvatar displayName={displayName} photoURL={photoURL}/>
      </div>
      <div className="passport-identity">
        <div><strong>{displayName}</strong><span>Member since {memberSince}</span></div>
        <strong className="passport-percentage">{insights.networkCoveragePercent}%</strong>
      </div>
      <div className="passport-coverage" aria-label={`${insights.networkCoveragePercent} percent of Kochi Metro explored`}>
        <i style={{ width: `${insights.networkCoveragePercent}%` }}/>
      </div>
      <p>Explored {insights.networkCoveragePercent}% of Kochi Metro · {insights.uniqueStationsVisited} of {insights.totalOperationalStations} stations stamped</p>
    </header>

    {loadError && <ErrorMessage message={loadError}/>}

    <section className="passport-stats-grid" aria-label="Passport statistics">
      <article data-animate><TrainFront/><strong>{insights.totalJourneys}</strong><span>Total journeys</span></article>
      <article data-animate><MapPinned/><strong>{insights.totalDistanceKm.toFixed(1)}</strong><span>Kilometres</span></article>
      <article data-animate><Sparkles/><strong>{insights.uniqueStationsVisited}</strong><span>Unique stations</span></article>
      <article data-animate><Flame/><strong>{insights.currentStreak}</strong><span>Current streak</span></article>
      <article data-animate><span className="stat-symbol">★</span><strong>{insights.longestStreak}</strong><span>Longest streak</span></article>
      <article data-animate><span className="stat-symbol">◎</span><strong>{insights.mostVisitedStation?.station.shortName ?? insights.mostVisitedStation?.station.name}</strong><span>Most visited</span></article>
      <article data-animate><span className="stat-symbol">↗</span><strong>{longestRide?.distanceKm.toFixed(1)} km</strong><span>Longest journey</span></article>
      <article data-animate><span className="stat-symbol">M</span><strong>{insights.thisMonthDistanceKm.toFixed(1)} km</strong><span>This month</span></article>
    </section>

    {user && <LeaderboardRanksCard uid={user.uid}/>}
    {user && <ExploreProfileSummary uid={user.uid} journeys={journeys} compact/>}

    <MonthlyActivityChart months={insights.monthlyActivity}/>

    <section className="passport-section" aria-labelledby="monthly-comparison-title" data-animate>
      <div className="passport-section-heading"><div><span className="eyebrow">At a glance</span><h2 id="monthly-comparison-title">Month comparison</h2></div></div>
      <div className="month-comparison">
        <div><strong>{insights.thisMonthJourneyCount}</strong><span>This month journeys</span><small>{insights.thisMonthDistanceKm.toFixed(1)} km</small></div>
        <ArrowRight aria-hidden="true"/>
        <div><strong>{insights.previousMonthJourneyCount}</strong><span>Previous month journeys</span><small>{insights.previousMonthDistanceKm.toFixed(1)} km</small></div>
      </div>
    </section>

    <MetroNetworkProgress visitedStationIds={insights.visitedStationIds} firstVisitedByStation={insights.firstVisitedByStation}/>
    <PassportStampGrid visitedStationIds={insights.visitedStationIds} firstVisitedByStation={insights.firstVisitedByStation}/>

    <section className="passport-section" aria-labelledby="personal-records-title" data-animate>
      <div className="passport-section-heading"><div><span className="eyebrow">Milestones</span><h2 id="personal-records-title">Personal records</h2></div></div>
      <dl className="passport-records">
        <div><dt>Longest ride</dt><dd>{longestRide ? routeLabel(longestRide.fromStation.name, longestRide.toStation.name) : "—"}<small>{longestRide ? `${longestRide.distanceKm.toFixed(1)} km` : ""}</small></dd></div>
        <div><dt>Longest by stations</dt><dd>{insights.longestJourneyByIntervals ? routeLabel(insights.longestJourneyByIntervals.fromStation.name, insights.longestJourneyByIntervals.toStation.name) : "—"}<small>{insights.longestJourneyByIntervals ? `${insights.longestJourneyByIntervals.stationIntervals} intervals` : ""}</small></dd></div>
        <div><dt>Most travelled route</dt><dd>{mostCommonRoute ? routeLabel(mostCommonRoute.fromStation.name, mostCommonRoute.toStation.name) : "—"}<small>{mostCommonRoute ? `${mostCommonRoute.count} journey${mostCommonRoute.count === 1 ? "" : "s"}` : ""}</small></dd></div>
        <div><dt>Most common origin</dt><dd>{insights.mostCommonOrigin?.station.name ?? "—"}<small>{insights.mostCommonOrigin ? `${insights.mostCommonOrigin.count} departures` : ""}</small></dd></div>
        <div><dt>Most common destination</dt><dd>{insights.mostCommonDestination?.station.name ?? "—"}<small>{insights.mostCommonDestination ? `${insights.mostCommonDestination.count} arrivals` : ""}</small></dd></div>
        <div><dt>First Veyro journey</dt><dd>{insights.firstJourneyDate ? format(insights.firstJourneyDate, "d MMMM yyyy") : "—"}</dd></div>
      </dl>
    </section>

    <section className="passport-section passport-share-section" aria-labelledby="share-passport-title" data-animate>
      <div className="passport-section-heading"><div><span className="eyebrow">Privacy-safe recap</span><h2 id="share-passport-title">Share your Passport</h2></div></div>
      <p className="muted">Share a public link containing only your display name and travel totals—never your email, tickets, QR values, or exact journey times.</p>
      <PassportShareCard summary={shareSummary}/>
      <div className="passport-link-note"><Link2 size={17}/><span>The recap is stored in the link itself. Opening it does not read your Firebase account.</span></div>
      {shareError && <ErrorMessage message={shareError}/>}
      {shareStatus && <p className="share-success" role="status"><Check size={17}/>{shareStatus}</p>}
      <button className="primary-button w-full" disabled={sharing} onClick={() => void sharePassport()}>
        <Share2 size={18}/>{sharing ? "Opening share options…" : "Share Passport Link"}
      </button>
    </section>
  </section></AppShell>;
}
