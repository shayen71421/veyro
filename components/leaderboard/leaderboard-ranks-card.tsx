"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { getCompetitionRank, getLeaderboardMembership } from "@/lib/leaderboard/queries";
import { leaderboardCategories, categoryLabel, type LeaderboardCategory } from "@/lib/leaderboard/ranking";

export function LeaderboardRanksCard({ uid, title = "Community Leaderboard" }: { uid: string; title?: string }) {
  const [ranks, setRanks] = useState<Partial<Record<LeaderboardCategory, number>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<boolean | null>(null);
  const load = async () => {
    if (loading || ranks) return;
    setLoading(true);
    try {
      const membership = await getLeaderboardMembership(uid);
      const entry = membership?.entry?.visible ? membership.entry : null;
      setJoined(Boolean(entry));
      if (entry) {
        const values = await Promise.all(leaderboardCategories.map((category) => getCompetitionRank(entry, category)));
        setRanks(Object.fromEntries(leaderboardCategories.map((category, index) => [category, values[index]])));
      } else setRanks({});
    } finally {
      setLoading(false);
    }
  };
  return <section className="leaderboard-access-card">
    <div className="leaderboard-access-heading"><Trophy/><div><span className="eyebrow">Community</span><h2>{title}</h2></div></div>
    {ranks ? joined ? <div className="leaderboard-mini-ranks">
      {leaderboardCategories.map((category) => <div key={category}><span>{categoryLabel(category)}</span><strong>#{ranks[category]}</strong></div>)}
    </div> : <p className="muted">Join from Profile to publish safe summary statistics and see your positions.</p>
      : <p className="muted">Reveal your Distance, Journeys and Best Streak positions when you need them.</p>}
    {!ranks && <button className="secondary-button w-full" disabled={loading} onClick={() => void load()}>{loading ? "Loading ranks…" : "Show my ranks"}</button>}
    <Link href="/leaderboard/" className="secondary-button w-full">View Leaderboard <ArrowRight size={17}/></Link>
  </section>;
}
