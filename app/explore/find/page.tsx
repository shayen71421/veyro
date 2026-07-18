"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, ExternalLink, Flag, Heart, MapPin } from "lucide-react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { ExploreFindCard } from "@/components/explore/ExploreFindCard";
import { ReportFindSheet } from "@/components/explore/ReportFindSheet";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { getInteractions, getPublishedFind } from "@/lib/explore/queries";
import { setExploreReaction, updateExploreInteraction } from "@/lib/explore/interactions";
import { mapsUrl, type ExploreFind, type ExploreInteraction, type ExploreReaction } from "@/lib/explore/types";

function toDate(value: ExploreFind["publishedAt"]) {
  return value instanceof Date ? value : value?.toDate?.() ?? null;
}

function FindDetailContent() {
  const params = useSearchParams(); const auth = useAuth(); const id = params.get("id") ?? "";
  const [find, setFind] = useState<ExploreFind | null>(null); const [interaction, setInteraction] = useState<ExploreInteraction>();
  const [loading, setLoading] = useState(true); const [reporting, setReporting] = useState(false);
  useEffect(() => { if (!auth.user || !id) return; void Promise.all([getPublishedFind(id), getInteractions(auth.user.uid)]).then(([next, interactions]) => { setFind(next); setInteraction(interactions.get(id)); }).finally(() => setLoading(false)); }, [auth.user, id]);
  const act = async (action: "save" | "visit" | "hide", value: boolean) => { if (!auth.user || !find) return; await updateExploreInteraction(auth.user.uid, find.id, action, value); setInteraction((current) => ({ findId: find.id, saved: action === "save" ? value : current?.saved ?? false, visited: action === "visit" ? value : current?.visited ?? false, hidden: action === "hide" ? value : current?.hidden ?? false, reaction: action === "visit" && !value ? null : current?.reaction ?? null, firstSeenAt: current?.firstSeenAt ?? new Date(), savedAt: null, visitedAt: null, reactionAt: null, hiddenAt: null, updatedAt: new Date() })); };
  const react = async (reaction: ExploreReaction) => { if (!auth.user || !find) return; await setExploreReaction(auth.user.uid, find.id, reaction); setInteraction((current) => current ? { ...current, reaction } : current); };
  if (!id) return <div className="explore-empty"><AlertTriangle/><h1>Find unavailable</h1><p>The Find link is missing its public identifier.</p><Link href="/explore/" className="primary-button">Back to Explore</Link></div>;
  if (loading) return <LoadingSkeleton className="explore-detail-skeleton"/>;
  if (!find) return <div className="explore-empty"><AlertTriangle/><h1>Find unavailable</h1><p>It may have been hidden, removed, or the link may be incorrect.</p><Link href="/explore/" className="primary-button">Back to Explore</Link></div>;
  const published = toDate(find.publishedAt); const verified = find.verifiedAt instanceof Date ? find.verifiedAt : find.verifiedAt?.toDate?.() ?? null;
  return <><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">{find.authorBadge}</span><h1>{find.title}</h1><p><MapPin size={15}/>{find.stationName} Metro · {find.walkingMinutes} minute {find.walkingTimeType} walk</p></header>
    <ExploreFindCard find={find} interaction={interaction} onAction={(action, value) => void act(action, value)} onReaction={(reaction) => void react(reaction)}/>
    <section className="find-detail-copy"><h2>About this Find</h2><p>{find.description}</p>{find.accessibilityNote && <><h3>Accessibility note</h3><p>{find.accessibilityNote}</p></>}<dl><div><dt>Best times</dt><dd>{find.bestTimes.length ? find.bestTimes.join(", ") : "Check before visiting"}</dd></div><div><dt>Community love</dt><dd><Heart size={15}/>{find.loveCount}</dd></div>{published && <div><dt>Published</dt><dd><CalendarDays size={15}/>{format(published, "d MMM yyyy")}</dd></div>}{find.authorType === "veyro_team" && verified && <div><dt>Last verified</dt><dd>{format(verified, "d MMM yyyy")}</dd></div>}</dl></section>
    <a className="primary-button w-full" href={mapsUrl(find)} target="_blank" rel="noopener noreferrer">Open in Google Maps <ExternalLink size={17}/></a>
    <button className="secondary-button w-full mt-3" onClick={() => setReporting(true)}><Flag size={16}/>Report this Find</button>
    <p className="find-disclaimer">{find.authorType === "veyro_team" ? "Veyro Curated recommendation." : "Traveller-created recommendation."} Verify current access, prices and opening hours before visiting.</p>
    {reporting && auth.user && <ReportFindSheet uid={auth.user.uid} findId={find.id} onClose={() => setReporting(false)}/>}
  </>;
}

export default function FindDetailPage() {
  return <AppShell><section className="page explore-page"><Suspense fallback={<LoadingSkeleton className="explore-detail-skeleton"/>}><FindDetailContent/></Suspense></section></AppShell>;
}
