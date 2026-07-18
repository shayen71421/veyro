"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, CheckCircle2, Compass, FilePlus2, Filter, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExploreFindCard } from "@/components/explore/ExploreFindCard";
import { ExplorerEligibilityCard } from "@/components/explore/ExplorerEligibilityCard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAuth } from "@/features/auth/auth-context";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { getExploreCandidates, getInteractions } from "@/lib/explore/queries";
import { buildTravelProfile } from "@/lib/explore/build-travel-profile";
import { rankExploreFinds } from "@/lib/explore/rank-explore-finds";
import { calculateExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";
import { syncExploreEligibility } from "@/lib/explore/eligibility-service";
import { setExploreReaction, updateExploreInteraction } from "@/lib/explore/interactions";
import { isExploreAdmin } from "@/lib/explore/admin-service";
import { categoryLabels, costLabels, costTypes, environmentLabels, environmentTypes, exploreCategories, type ExploreInteraction, type ExploreReaction } from "@/lib/explore/types";
import { kochiMetroStations } from "@/data/kochi-metro-stations";
import type { Journey } from "@/types";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";

export default function ExplorePage() {
  const auth = useAuth(); const pageRef = useRef<HTMLElement>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [finds, setFinds] = useState<Awaited<ReturnType<typeof getExploreCandidates>>>([]);
  const [interactions, setInteractions] = useState<Map<string, ExploreInteraction>>(new Map());
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [admin, setAdmin] = useState(false); const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("all");
  const [station, setStation] = useState("all"); const [cost, setCost] = useState("all");
  const [environment, setEnvironment] = useState("all"); const [maxWalk, setMaxWalk] = useState(25);
  const [curatedOnly, setCuratedOnly] = useState(false); const [privateFilter, setPrivateFilter] = useState("all");
  useGsapEntrance(pageRef);

  const load = async (refresh = false) => {
    if (!auth.user) return;
    setLoading(true); setError("");
    try {
      const loadedJourneys = await getAllJourneys(auth.user.uid);
      const profile = buildTravelProfile(loadedJourneys);
      const relevantStations = [...profile.endpointFrequency.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 5);
      const [loadedFinds, loadedInteractions, isAdmin] = await Promise.all([
        getExploreCandidates(relevantStations, refresh), getInteractions(auth.user.uid), isExploreAdmin(auth.user.uid),
      ]);
      setJourneys(loadedJourneys); setFinds(loadedFinds); setInteractions(loadedInteractions); setAdmin(isAdmin);
      void syncExploreEligibility(auth.user.uid);
    } catch { setError("We could not load Explore. Check your connection and try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => rankExploreFinds(finds, journeys, [...interactions.values()]), [finds, journeys, interactions]);
  const travelProfile = useMemo(() => buildTravelProfile(journeys), [journeys]);
  const filtered = useMemo(() => ranked.filter(({ find }) =>
    (category === "all" || find.category === category)
    && (station === "all" || find.stationId === station)
    && (cost === "all" || find.costType === cost)
    && (environment === "all" || find.environment === environment)
    && find.walkingMinutes <= maxWalk
    && (!curatedOnly || find.authorType === "veyro_team")
    && (privateFilter === "all"
      || (privateFilter === "saved" && interactions.get(find.id)?.saved)
      || (privateFilter === "visited" && interactions.get(find.id)?.visited)
      || (privateFilter === "unvisited" && !interactions.get(find.id)?.visited))
    && (!search || `${find.title} ${find.stationName} ${find.description}`.toLowerCase().includes(search.toLowerCase()))), [ranked, category, station, cost, environment, maxWalk, curatedOnly, privateFilter, interactions, search]);
  const eligibility = useMemo(() => calculateExplorerEligibility(journeys), [journeys]);
  const used = travelProfile.usedEndpoints;
  const interactionFor = (id: string) => interactions.get(id);
  const act = async (findId: string, action: "save" | "visit" | "hide", value: boolean) => {
    if (!auth.user) return;
    await updateExploreInteraction(auth.user.uid, findId, action, value);
    const current = interactions.get(findId);
    setInteractions(new Map(interactions).set(findId, {
      findId, saved: action === "save" ? value : current?.saved ?? false,
      visited: action === "visit" ? value : current?.visited ?? false,
      hidden: action === "hide" ? value : current?.hidden ?? false,
      reaction: action === "visit" && !value ? null : current?.reaction ?? null,
      firstSeenAt: current?.firstSeenAt ?? new Date(), savedAt: null, visitedAt: null,
      reactionAt: null, hiddenAt: null, updatedAt: new Date(),
    }));
  };
  const react = async (findId: string, reaction: ExploreReaction) => {
    if (!auth.user) return;
    await setExploreReaction(auth.user.uid, findId, reaction);
    const current = interactions.get(findId); if (!current) return;
    setInteractions(new Map(interactions).set(findId, { ...current, reaction, reactionAt: reaction ? new Date() : null, updatedAt: new Date() }));
    setFinds((currentFinds) => currentFinds.map((find) => find.id === findId ? {
      ...find, loveCount: Math.max(0, find.loveCount + ((reaction === "loved" ? 1 : 0) - (current.reaction === "loved" ? 1 : 0))),
    } : find));
  };
  const section = (title: string, subtitle: string, entries: typeof ranked) => entries.length ? <section className="explore-section" data-animate>
    <header><div><h2>{title}</h2><p>{subtitle}</p></div></header>
    <div className="explore-card-list">{entries.slice(0, 8).map(({ find, reason }) => <ExploreFindCard key={find.id} find={find} reason={reason} interaction={interactionFor(find.id)} onAction={(action, value) => void act(find.id, action, value)} onReaction={(reaction) => void react(find.id, reaction)}/>)}</div>
  </section> : null;

  return <AppShell><section ref={pageRef} className="page explore-page">
    <header className="explore-header" data-animate><div><span className="eyebrow">Veyro Finds</span><h1>Explore Kochi</h1><p>Real places and small experiences shared around the metro network.</p></div><button className="icon-button" onClick={() => void load(true)} aria-label="Refresh Explore"><RefreshCw size={19}/></button></header>
    <nav className="explore-shortcuts" aria-label="Explore shortcuts" data-animate>
      <Link href="/explore/saved/"><Bookmark/><span>Saved</span></Link><Link href="/explore/visited/"><CheckCircle2/><span>Visited</span></Link>
      {eligibility.eligible && <Link href="/explore/my-finds/"><FilePlus2/><span>My Finds</span></Link>}
      {admin && <Link href="/admin/explore/"><ShieldCheck/><span>Admin</span></Link>}
    </nav>
    <button className="explore-filter-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}><Filter size={17}/>Search and filter</button>
    {filtersOpen && <div className="explore-filters" data-animate>
      <label>Search loaded Finds<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Place or station"/></label>
      <label>Station<select value={station} onChange={(event) => setStation(event.target.value)}><option value="all">All loaded stations</option>{kochiMetroStations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{exploreCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
      <label>Cost<select value={cost} onChange={(event) => setCost(event.target.value)}><option value="all">Any cost</option>{costTypes.map((item) => <option key={item} value={item}>{costLabels[item]}</option>)}</select></label>
      <label>Environment<select value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="all">Indoor or outdoor</option>{environmentTypes.map((item) => <option key={item} value={item}>{environmentLabels[item]}</option>)}</select></label>
      <label>Private status<select value={privateFilter} onChange={(event) => setPrivateFilter(event.target.value)}><option value="all">All Finds</option><option value="unvisited">Not yet visited</option><option value="saved">Saved</option><option value="visited">Visited</option></select></label>
      <label>Maximum walk: {maxWalk} minutes<input type="range" min={1} max={25} value={maxWalk} onChange={(event) => setMaxWalk(Number(event.target.value))}/></label>
      <label className="filter-check"><input type="checkbox" checked={curatedOnly} onChange={(event) => setCuratedOnly(event.target.checked)}/><span>Veyro Curated only</span></label>
    </div>}
    {error && <ErrorMessage message={error}/>}
    {loading ? <div className="explore-loading">{Array.from({ length: 4 }, (_, index) => <LoadingSkeleton className="h-28" key={index}/>)}</div> : finds.length === 0 ? <section className="explore-empty"><Compass size={42}/><h2>Explore is ready for curated Finds</h2><p>No published Finds are available yet. An administrator can validate and seed the researched collection.</p></section> : <>
      {!journeys.length && <p className="explore-personal-note" data-animate>Travel with Veyro to make Explore more personal.</p>}
      {search || category !== "all" || station !== "all" || cost !== "all" || environment !== "all" || maxWalk < 25 || curatedOnly || privateFilter !== "all" ? section("Filtered Finds", `${filtered.length} matching places from your loaded candidates`, filtered) : <>
        {section("For You", "Explainable recommendations shaped by your metro journeys and private choices.", ranked)}
        {!journeys.length && section("Quick Stops", "Places with shorter estimated walks from the metro.", ranked.filter(({ find }) => find.walkingMinutes <= 8))}
        {!journeys.length && section("Free Places", "Ideas listed as free; verify current access before visiting.", ranked.filter(({ find }) => find.costType === "free"))}
        {section("Near Your Routes", "Places connected to stations you use and common routes.", ranked.filter(({ find }) => used.has(find.stationId) || travelProfile.routeStations.has(find.stationId)))}
        {section("Discover Somewhere New", "Ideas around stations you have not used as journey endpoints.", ranked.filter(({ find }) => !used.has(find.stationId)))}
        {section("Popular Finds", "Community-loved places, without public dislike counts.", [...ranked].sort((a, b) => b.find.loveCount - a.find.loveCount))}
        {section("Veyro Curated", "Researched by Veyro—not an official Kochi Metro recommendation.", ranked.filter(({ find }) => find.authorType === "veyro_team"))}
        {section("Recently Added", "Newly published places to consider for a future stop.", [...ranked].sort((a, b) => String(b.find.publishedAt).localeCompare(String(a.find.publishedAt))))}
      </>}
    </>}
    {!loading && <ExplorerEligibilityCard eligibility={eligibility}/>}
  </section></AppShell>;
}
