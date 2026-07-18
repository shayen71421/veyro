import { LeaderboardAvatar } from "@/components/leaderboard/leaderboard-avatar";
import { formatLeaderboardMetric, type LeaderboardCategory, type LeaderboardEntry } from "@/lib/leaderboard/ranking";

export function LeaderboardRow({ entry, rank, category, isYou = false }: {
  entry: LeaderboardEntry;
  rank: number;
  category: LeaderboardCategory;
  isYou?: boolean;
}) {
  const rankClass = rank <= 3 ? `rank-${rank}` : "rank-standard";
  return <article className={`leaderboard-row ${rankClass} ${isYou ? "is-you" : ""}`} data-leaderboard-row>
    <strong className="leaderboard-rank">{rank}</strong>
    <LeaderboardAvatar name={entry.displayName} photoURL={entry.showPhoto ? entry.photoURL : null}/>
    <span className="leaderboard-name">{entry.displayName}{isYou && <small>You</small>}</span>
    <strong className="leaderboard-metric">{formatLeaderboardMetric(entry, category)}</strong>
  </article>;
}
