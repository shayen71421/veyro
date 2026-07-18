"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { getCompetitionRank, getLeaderboardMembership, getTopFiveLeaderboard } from "@/lib/leaderboard/queries";
import type { LeaderboardEntry } from "@/lib/leaderboard/ranking";

export function HomeLeaderboardCard() {
  const { user, demo } = useAuth();
  const [leader, setLeader] = useState<LeaderboardEntry | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);
  useEffect(() => {
    if (!user || demo) return;
    let active = true;
    void Promise.all([getTopFiveLeaderboard("distance"), getLeaderboardMembership(user.uid)]).then(async ([top, membership]) => {
      if (!active) return;
      setLeader(top[0] ?? null);
      const entry = membership?.entry?.visible ? membership.entry : null;
      setJoined(Boolean(entry));
      if (entry) setRank(await getCompetitionRank(entry, "distance"));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user, demo]);
  return <section className="home-leaderboard-card" data-animate>
    <div><span className="eyebrow">Distance ranking</span><h2><Trophy size={18}/>Community Leaderboard</h2></div>
    {leader ? <p><strong>{leader.displayName}</strong><span>leads with {leader.totalDistanceKm.toFixed(1)} km</span></p> : <p><strong>No leader yet</strong><span>Be the first traveller to join.</span></p>}
    {joined && rank && <small>Your distance rank · #{rank}</small>}
    {!joined && <small>Join from Profile to reveal your rank.</small>}
    <Link href="/leaderboard/" className="secondary-button">View Leaderboard <ArrowRight size={17}/></Link>
  </section>;
}
