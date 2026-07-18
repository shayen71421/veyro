"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExploreFindCard } from "@/components/explore/ExploreFindCard";
import { useAuth } from "@/features/auth/auth-context";
import { getFindsByIds, getInteractions } from "@/lib/explore/queries";
import { useEffect, useState } from "react";
import type { ExploreFind, ExploreInteraction } from "@/lib/explore/types";
import { updateExploreInteraction } from "@/lib/explore/interactions";

export default function SavedFindsPage() {
  const auth = useAuth(); const [finds, setFinds] = useState<ExploreFind[]>([]); const [interactions, setInteractions] = useState(new Map<string, ExploreInteraction>()); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!auth.user) return; void getInteractions(auth.user.uid).then(async (next) => { setInteractions(next); setFinds(await getFindsByIds([...next.values()].filter((item) => item.saved).map((item) => item.findId))); }).finally(() => setLoading(false)); }, [auth.user]);
  return <AppShell><section className="page explore-page"><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">Private collection</span><h1>Saved Finds</h1></header>
    {loading ? <p className="muted">Loading saved Finds…</p> : finds.length ? <div className="explore-card-list">{finds.map((find) => <ExploreFindCard key={find.id} find={find} interaction={interactions.get(find.id)} onAction={(action, value) => { if (auth.user) void updateExploreInteraction(auth.user.uid, find.id, action, value).then(() => action === "save" && !value && setFinds((items) => items.filter((item) => item.id !== find.id))); }}/>)}</div> : <div className="explore-empty"><Bookmark/><h2>Nothing saved yet</h2><p>Save a Find to keep it ready for your next metro journey.</p><Link className="primary-button" href="/explore/">Browse Explore</Link></div>}
  </section></AppShell>;
}
