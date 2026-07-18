"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FilePlus2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/features/auth/auth-context";
import { getMyExploreSubmissions, reviseExploreSubmission, withdrawExploreSubmission } from "@/lib/explore/submissions";

type Submission = { id: string; title?: string; stationName?: string; status?: string; moderationMessage?: string | null };

export default function MyFindsPage() {
  const auth = useAuth(); const [submissions, setSubmissions] = useState<Submission[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!auth.user) return; void getMyExploreSubmissions(auth.user.uid).then((items) => setSubmissions(items as Submission[])).finally(() => setLoading(false)); }, [auth.user]);
  const withdraw = async (id: string) => { if (!auth.user) return; await withdrawExploreSubmission(auth.user.uid, id); setSubmissions((items) => items.map((item) => item.id === id ? { ...item, status: "removed" } : item)); };
  const revise = async (item: Submission) => {
    if (!auth.user) return;
    const title = window.prompt("Place name", item.title ?? ""); if (!title) return;
    const description = window.prompt("Corrected description (30–500 characters). Published edits return to pending review.");
    if (!description) return;
    await reviseExploreSubmission(auth.user.uid, item.id, title, description);
    setSubmissions((items) => items.map((value) => value.id === item.id ? { ...value, title, status:"pending", moderationMessage:null } : value));
  };
  return <AppShell><section className="page explore-page"><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">Contributor workspace</span><h1>My Finds</h1><p>Track moderation status. Published edits require reapproval; direct publishing is never available.</p></header>
    <Link href="/explore/new/" className="primary-button w-full"><FilePlus2 size={17}/>Add a Find</Link>
    {loading ? <p className="muted mt-4">Loading submissions…</p> : submissions.length ? <div className="submission-list">{submissions.map((item) => <article key={item.id}><div><span className={`status-badge ${item.status}`}>{item.status}</span><h2>{item.title}</h2><p>{item.stationName} Metro</p>{item.moderationMessage && <small>{item.moderationMessage}</small>}<div className="submission-actions">{["pending","rejected","published"].includes(item.status ?? "") && <button className="secondary-button" onClick={() => void revise(item)}>Edit {item.status === "published" ? "& return to review" : ""}</button>}</div></div>{["pending", "rejected"].includes(item.status ?? "") && <button className="icon-button danger" onClick={() => void withdraw(item.id)} aria-label={`Withdraw ${item.title}`}><Trash2 size={17}/></button>}</article>)}</div> : <div className="explore-empty"><FilePlus2/><h2>No submissions yet</h2><p>Eligible Local Explorers can share useful places for administrator review.</p></div>}
  </section></AppShell>;
}
