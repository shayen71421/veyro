"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExploreFindCard } from "@/components/explore/ExploreFindCard";
import { useAuth } from "@/features/auth/auth-context";
import { getFindsByIds, getInteractions } from "@/lib/explore/queries";
import { setExploreReaction } from "@/lib/explore/interactions";
import { useEffect, useState } from "react";
import type { ExploreFind, ExploreInteraction, ExploreReaction } from "@/lib/explore/types";

export default function VisitedFindsPage() {
  const auth = useAuth(); const [finds, setFinds] = useState<ExploreFind[]>([]); const [interactions, setInteractions] = useState(new Map<string, ExploreInteraction>()); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!auth.user) return; void getInteractions(auth.user.uid).then(async (next) => { setInteractions(next); setFinds(await getFindsByIds([...next.values()].filter((item) => item.visited).map((item) => item.findId))); }).finally(() => setLoading(false)); }, [auth.user]);
  const react = async (findId: string, reaction: ExploreReaction) => { if (!auth.user) return; await setExploreReaction(auth.user.uid, findId, reaction); const current = interactions.get(findId); if (current) setInteractions(new Map(interactions).set(findId, { ...current, reaction })); };
  const groups = [{ label: "Loved", test: (item: ExploreInteraction) => item.reaction === "loved" }, { label: "Not for Me", test: (item: ExploreInteraction) => item.reaction === "not_for_me" }, { label: "No reaction yet", test: (item: ExploreInteraction) => !item.reaction }];
  return <AppShell><section className="page explore-page"><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">Explicit visits only</span><h1>Visited Finds</h1><p>Metro journeys never mark a place visited. Only your “Mark as Visited” choices appear here.</p></header>
    {loading ? <p className="muted">Loading visited Finds…</p> : finds.length ? <><section className="explore-section"><h2>Recently visited</h2><div className="explore-card-list">{finds.slice(0, 5).map((find) => <ExploreFindCard key={find.id} find={find} interaction={interactions.get(find.id)} onReaction={(reaction) => void react(find.id, reaction)}/>)}</div></section>{groups.map((group) => { const entries = finds.filter((find) => { const value = interactions.get(find.id); return value ? group.test(value) : false; }); return entries.length ? <section className="explore-section" key={group.label}><h2>{group.label}</h2><div className="explore-card-list">{entries.map((find) => <ExploreFindCard key={find.id} find={find} interaction={interactions.get(find.id)} onReaction={(reaction) => void react(find.id, reaction)}/>)}</div></section> : null; })}</> : <div className="explore-empty"><MapPin/><h2>No visited Finds yet</h2><p>Mark a place visited only after you actually experience it.</p><Link className="primary-button" href="/explore/">Browse Explore</Link></div>}
  </section></AppShell>;
}
