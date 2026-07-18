"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Trophy, X } from "lucide-react";
import gsap from "gsap";
import { ErrorMessage } from "@/components/ui/error-message";
import { JoinLeaderboardSheet } from "@/components/leaderboard/join-leaderboard-sheet";
import {
  getCompetitionRank,
  getLeaderboardMembership,
  type LeaderboardMembership,
} from "@/lib/leaderboard/queries";
import { categoryLabel, leaderboardCategories, type LeaderboardCategory } from "@/lib/leaderboard/ranking";
import {
  joinLeaderboard,
  leaveLeaderboard,
  setLeaderboardPhotoVisibility,
} from "@/lib/leaderboard/sync-leaderboard-entry";
import type { Journey } from "@/types";

function LeaveSheet({ busy, onLeave, onClose }: { busy: boolean; onLeave: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(".leaderboard-sheet-backdrop", { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.2 });
      gsap.fromTo(".leaderboard-sheet", { opacity: 0, y: reduced ? 0 : 28 }, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.3, ease: "power2.out" });
      const content = ref.current?.querySelectorAll(".leaderboard-sheet > *");
      if (content?.length) {
        gsap.fromTo(
          content,
          { opacity: 0, y: reduced ? 0 : 8 },
          { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.22, stagger: reduced ? 0 : 0.035, delay: reduced ? 0 : 0.08 },
        );
      }
    }, ref);
    return () => context.revert();
  }, []);
  return <div ref={ref} className="leaderboard-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="leave-leaderboard-title">
    <button className="leaderboard-sheet-backdrop" onClick={onClose} aria-label="Close leave dialog"/>
    <section className="leaderboard-sheet">
      <button className="icon-button leaderboard-sheet-close" onClick={onClose} aria-label="Close"><X/></button>
      <Trophy className="text-accent"/>
      <h2 id="leave-leaderboard-title">Leave the leaderboard?</h2>
      <p>Your public entry will be hidden immediately. Your journeys and Passport statistics will not be deleted.</p>
      <button className="secondary-button danger w-full" disabled={busy} onClick={onLeave}>{busy ? "Leaving…" : "Leave Leaderboard"}</button>
      <button className="secondary-button w-full" disabled={busy} onClick={onClose}>Keep My Position</button>
    </section>
  </div>;
}

export function ProfileLeaderboardSettings({ uid, displayName, photoURL, journeys, demo }: {
  uid: string;
  displayName: string;
  photoURL: string | null;
  journeys: readonly Journey[];
  demo: boolean;
}) {
  const [membership, setMembership] = useState<LeaderboardMembership | null>(null);
  const [ranks, setRanks] = useState<Partial<Record<LeaderboardCategory, number>>>({});
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (demo) { setLoading(false); return; }
    try {
      const next = await getLeaderboardMembership(uid);
      setMembership(next);
      if (next?.entry?.visible) {
        const values = await Promise.all(leaderboardCategories.map((category) => getCompetitionRank(next.entry!, category)));
        setRanks(Object.fromEntries(leaderboardCategories.map((category, index) => [category, values[index]])));
      } else setRanks({});
    } catch {
      setError("We could not load your leaderboard settings.");
    } finally { setLoading(false); }
  }, [uid, demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const join = async () => {
    setBusy(true); setError("");
    try {
      if (!demo) await joinLeaderboard({ uid, displayName, photoURL, journeys });
      setJoinOpen(false); await load();
    } catch {
      setJoinOpen(false); setError("We could not join the leaderboard safely.");
    } finally { setBusy(false); }
  };

  const leave = async () => {
    setBusy(true); setError("");
    try {
      if (!demo) await leaveLeaderboard(uid);
      setLeaveOpen(false); await load();
    } catch {
      setLeaveOpen(false); setError("We could not leave the leaderboard. Try again.");
    } finally { setBusy(false); }
  };

  const togglePhoto = async (showPhoto: boolean) => {
    setBusy(true); setError("");
    try {
      await setLeaderboardPhotoVisibility(uid, photoURL, showPhoto);
      await load();
    } catch { setError("We could not update profile-photo visibility."); }
    finally { setBusy(false); }
  };

  const joined = membership?.entry?.visible === true;
  return <section className="leaderboard-settings" aria-labelledby="profile-leaderboard-title">
    <div className="leaderboard-access-heading"><Trophy/><div><span className="eyebrow">Opt-in community</span><h2 id="profile-leaderboard-title">Community Leaderboard</h2></div></div>
    {error && <ErrorMessage message={error}/>}
    {loading ? <p className="muted">Loading leaderboard settings…</p> : <>
      <div className="leaderboard-setting-row">
        <div><strong>Join Veyro Leaderboard</strong><span>Publish your public name and summary statistics.</span></div>
        <button className={`settings-toggle ${joined ? "active" : ""}`} role="switch" aria-checked={joined} disabled={busy} onClick={() => joined ? setLeaveOpen(true) : setJoinOpen(true)}><i/></button>
      </div>
      <div className="leaderboard-setting-row">
        <div><strong>Show Google profile photo</strong><span>Your photo is hidden by default.</span></div>
        <button className={`settings-toggle ${membership?.entry?.showPhoto ? "active" : ""}`} role="switch" aria-checked={membership?.entry?.showPhoto ?? false} disabled={!joined || busy || !photoURL} onClick={() => void togglePhoto(!membership?.entry?.showPhoto)}><i/></button>
      </div>
      {joined && <div className="leaderboard-mini-ranks">
        {leaderboardCategories.map((category) => <div key={category}><span>{categoryLabel(category)}</span><strong>#{ranks[category] ?? "—"}</strong></div>)}
      </div>}
      {!joined && <p className="muted">You can view community rankings without joining. Your rank stays private until you opt in.</p>}
    </>}
    <Link href="/leaderboard/" className="secondary-button w-full">View Leaderboard <ArrowRight size={17}/></Link>
    {joinOpen && <JoinLeaderboardSheet busy={busy} onJoin={() => void join()} onClose={() => setJoinOpen(false)}/>}
    {leaveOpen && <LeaveSheet busy={busy} onLeave={() => void leave()} onClose={() => setLeaveOpen(false)}/>}
  </section>;
}
