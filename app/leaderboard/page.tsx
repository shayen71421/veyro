"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, RefreshCw, Trophy, X } from "lucide-react";
import gsap from "gsap";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { LeaderboardRow } from "@/components/leaderboard/leaderboard-row";
import { JoinLeaderboardSheet } from "@/components/leaderboard/join-leaderboard-sheet";
import { useAuth } from "@/features/auth/auth-context";
import { getAllJourneys } from "@/features/journeys/journey-service";
import {
  clearLeaderboardCache,
  getCompetitionRank,
  getLeaderboardMembership,
  getTopFiveLeaderboard,
  leaderboardErrorMessage,
} from "@/lib/leaderboard/queries";
import {
  categoryLabel,
  competitionRank,
  leaderboardCategories,
  placeCurrentUser,
  type LeaderboardCategory,
  type LeaderboardEntry,
} from "@/lib/leaderboard/ranking";
import { joinLeaderboard, syncLeaderboardEntryForUser } from "@/lib/leaderboard/sync-leaderboard-entry";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";

const demoEntries: LeaderboardEntry[] = [
  ["arjun", "Arjun", 215.4, 38, 9],
  ["meera", "Meera", 187.2, 41, 7],
  ["rahul", "Rahul", 152.8, 28, 12],
  ["fathima", "Fathima", 141.3, 30, 6],
  ["neeraj", "Neeraj", 126.7, 24, 5],
  ["demo-user", "Shayen", 74.5, 8, 3],
].map(([id, name, distance, journeys, streak], index) => ({
  id: String(id), visible: true, displayName: String(name), displayNameNormalized: String(name).toLowerCase(),
  photoURL: null, showPhoto: false, totalDistanceKm: Number(distance), totalJourneys: Number(journeys),
  longestStreak: Number(streak), statsVersion: 1, joinedAt: new Date(2026, 0, index + 1), updatedAt: new Date(),
}));

export default function LeaderboardPage() {
  const { user, loading: authLoading, demo, displayName, photoURL } = useAuth();
  const pageRef = useRef<HTMLElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<LeaderboardCategory>("distance");
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [current, setCurrent] = useState<LeaderboardEntry | null>(null);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  useGsapEntrance(pageRef);

  useEffect(() => {
    const saved = sessionStorage.getItem("veyro-leaderboard-category");
    if (leaderboardCategories.includes(saved as LeaderboardCategory)) {
      queueMicrotask(() => setCategory(saved as LeaderboardCategory));
    }
  }, []);

  const load = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) { setRefreshing(true); clearLeaderboardCache(category); }
    else setLoading(true);
    try {
      if (demo) {
        const sorted = [...demoEntries].sort((a, b) => {
          if (category === "distance") return b.totalDistanceKm - a.totalDistanceKm;
          if (category === "journeys") return b.totalJourneys - a.totalJourneys;
          return b.longestStreak - a.longestStreak;
        });
        setTop(sorted.slice(0, 5));
        const yours = user ? sorted.find((entry) => entry.id === "demo-user") ?? null : null;
        setCurrent(yours);
        setCurrentRank(yours ? competitionRank(sorted, yours, category) : null);
        return;
      }
      if (!user) {
        setCurrent(null);
        setCurrentRank(null);
        setTop(await getTopFiveLeaderboard(category, refresh));
        return;
      }
      await syncLeaderboardEntryForUser(user.uid);
      const membership = await getLeaderboardMembership(user.uid);
      const yours = membership?.entry?.visible ? membership.entry : null;
      setCurrent(yours);
      const nextTop = await getTopFiveLeaderboard(category, refresh);
      setTop(nextTop);
      setCurrentRank(yours ? await getCompetitionRank(yours, category, refresh) : null);
    } catch (caught) {
      setError(leaderboardErrorMessage(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, demo, category]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useLayoutEffect(() => {
    if (!selectorRef.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const selected = selectorRef.current.querySelector<HTMLElement>(`[data-category="${category}"]`);
    const indicator = selectorRef.current.querySelector<HTMLElement>(".leaderboard-category-indicator");
    if (!selected || !indicator) return;
    const context = gsap.context(() => {
      gsap.to(indicator, { x: selected.offsetLeft, width: selected.offsetWidth, duration: reduced ? 0.01 : 0.28, ease: "power2.out" });
    }, selectorRef);
    return () => context.revert();
  }, [category]);

  useLayoutEffect(() => {
    if (!pageRef.current || loading) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Array.from(pageRef.current.querySelectorAll<HTMLElement>("[data-leaderboard-row]"));
    const currentRows = Array.from(pageRef.current.querySelectorAll<HTMLElement>(".leaderboard-row.is-you"));
    if (!rows.length && !currentRows.length) return;
    const context = gsap.context(() => {
      if (rows.length) {
        gsap.fromTo(rows, { opacity: 0, x: reduced ? 0 : -10 }, { opacity: 1, x: 0, stagger: reduced ? 0 : 0.06, duration: reduced ? 0.01 : 0.35 });
      }
      if (currentRows.length) {
        gsap.fromTo(currentRows, { boxShadow: "0 0 0 0 rgba(217,156,77,0)" }, { boxShadow: "0 0 0 2px rgba(217,156,77,.5)", duration: reduced ? 0.01 : 0.5 });
      }
    }, pageRef);
    return () => context.revert();
  }, [category, loading, top]);

  const selectCategory = (next: LeaderboardCategory) => {
    sessionStorage.setItem("veyro-leaderboard-category", next);
    setCategory(next);
  };

  const moveCategory = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + leaderboardCategories.length) % leaderboardCategories.length;
    const next = leaderboardCategories[nextIndex];
    selectCategory(next);
    selectorRef.current?.querySelector<HTMLButtonElement>(`[data-category="${next}"]`)?.focus();
  };

  const join = async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      const journeys = demo ? [] : await getAllJourneys(user.uid);
      if (!demo) await joinLeaderboard({ uid: user.uid, displayName, photoURL, journeys });
      setShowJoin(false);
      await load(true);
    } catch (caught) {
      setError(leaderboardErrorMessage(caught));
      setShowJoin(false);
    } finally { setJoining(false); }
  };

  const placement = placeCurrentUser(top, current, currentRank);
  const topRanks = top.map((entry) => competitionRank(top, entry, category));

  return <AppShell publicAccess><section ref={pageRef} className="page leaderboard-page">
    <header className="leaderboard-header" data-animate>
      <div className="leaderboard-toolbar">
        <Link className="icon-button" href={user ? "/home/" : "/"} aria-label={user ? "Back to home" : "Back to Veyro"}><ArrowLeft/></Link>
        <div>
          <button className="icon-button" onClick={() => setShowInfo(true)} aria-label="Leaderboard information"><Info/></button>
          <button className="icon-button" disabled={refreshing} onClick={() => void load(true)} aria-label="Refresh leaderboard"><RefreshCw className={refreshing ? "animate-spin" : ""}/></button>
        </div>
      </div>
      <span className="eyebrow">Veyro community</span>
      <h1>Veyro Leaderboard</h1>
      <p>See how the Veyro community is moving.</p>
    </header>

    <div ref={selectorRef} className="leaderboard-categories" role="tablist" aria-label="Leaderboard category" data-animate>
      <i className="leaderboard-category-indicator" aria-hidden="true"/>
      {leaderboardCategories.map((item, index) => <button key={item} role="tab" data-category={item} aria-selected={category === item} tabIndex={category === item ? 0 : -1} onKeyDown={(event) => moveCategory(event, index)} onClick={() => selectCategory(item)}>{categoryLabel(item)}</button>)}
    </div>

    {error && <ErrorMessage message={error}/>}
    {loading ? <div className="leaderboard-loading"><LoadingSkeleton className="h-28"/><LoadingSkeleton className="h-28"/><LoadingSkeleton className="h-28"/></div>
      : top.length ? <>
        <section className="leaderboard-list" aria-label={`Top five for ${categoryLabel(category)}`}>
          {top.map((entry, index) => <LeaderboardRow key={entry.id} entry={entry} rank={topRanks[index] ?? index + 1} category={category} isYou={entry.id === current?.id}/>)}
          {placement.currentRow && <><div className="your-position-divider"><span>Your position</span></div><LeaderboardRow entry={placement.currentRow.entry} rank={placement.currentRow.rank} category={category} isYou/></>}
        </section>
      </> : <div className="leaderboard-empty"><Trophy/><h2>No travellers are ranked yet. Be the first to join.</h2></div>}

    {!current && (user
      ? <button className="primary-button w-full leaderboard-join-action" onClick={() => setShowJoin(true)}>Join the Leaderboard</button>
      : authLoading
        ? <button className="primary-button w-full leaderboard-join-action" disabled>Checking sign-in…</button>
        : <Link className="primary-button w-full leaderboard-join-action" href="/login/?next=%2Fleaderboard%2F">Sign in to join the Leaderboard</Link>)}
    <p className="leaderboard-disclaimer">Based on traveller-created Veyro journey records. Not official Kochi Metro data.</p>
    <p className="leaderboard-verification-note">Leaderboard statistics are generated from Veyro journeys. Community rankings are not official or independently verified metro records. Showcase profiles may be included during demonstrations.</p>

    {showJoin && user && <JoinLeaderboardSheet busy={joining} onJoin={() => void join()} onClose={() => setShowJoin(false)}/>}
    {showInfo && <div className="leaderboard-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="leaderboard-info-title">
      <button className="leaderboard-sheet-backdrop" onClick={() => setShowInfo(false)} aria-label="Close information"/>
      <section className="leaderboard-sheet"><button className="icon-button leaderboard-sheet-close" onClick={() => setShowInfo(false)} aria-label="Close"><X/></button><Info className="text-accent"/><h2 id="leaderboard-info-title">How rankings work</h2><p>Top-five ties use the selected category&apos;s documented secondary fields. Public ranks use competition ranking by the primary metric, so tied travellers share a rank such as 1, 2, 2, 4.</p><button className="primary-button w-full" onClick={() => setShowInfo(false)}>Got it</button></section>
    </div>}
  </section></AppShell>;
}
