"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, EyeOff, RotateCcw, ShieldX, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CreateFindForm } from "@/components/explore/CreateFindForm";
import { useAuth } from "@/features/auth/auth-context";
import { createAdminExploreFind, getAdminExploreFinds, getAdminExploreReports, getAdminSourceRecords, isExploreAdmin, moderateExploreFind, resolveExploreReport, updateAdminSourceNotes } from "@/lib/explore/admin-service";
import type { CreateFindInput } from "@/lib/explore/submissions";

type AdminFind = { id: string; title?: string; stationName?: string; category?: string; description?: string; status?: string; authorDisplayName?: string; findId?: string; reason?: string; details?: string; sources?: unknown[]; verificationNotes?: string };
const tabs = ["pending", "published", "reported", "source verification", "hidden", "rejected", "removed"] as const;

export default function AdminExplorePage() {
  const auth = useAuth(); const [allowed, setAllowed] = useState<boolean | null>(null); const [tab, setTab] = useState<typeof tabs[number]>("pending"); const [finds, setFinds] = useState<AdminFind[]>([]); const [creating, setCreating] = useState(false); const [submitting, setSubmitting] = useState(false);
  const load = async (status = tab) => setFinds(
    status === "reported" ? await getAdminExploreReports() as AdminFind[]
      : status === "source verification" ? await getAdminSourceRecords() as AdminFind[]
        : await getAdminExploreFinds(status) as AdminFind[],
  );
  useEffect(() => { if (!auth.user) return; void isExploreAdmin(auth.user.uid).then((value) => { setAllowed(value); if (value) void load(); }); }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps
  const action = async (findId: string, actionName: "approve" | "reject" | "hide" | "restore" | "remove") => {
    const message = actionName === "reject" ? window.prompt("Moderation message (required)") : null;
    if (actionName === "reject" && !message) return;
    await moderateExploreFind({ findId, action: actionName, message }); await load();
  };
  return <AppShell><section className="page explore-page"><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">Protected administration</span><h1>Explore Administration</h1></header>
    {allowed === null ? <p className="muted">Checking administrator access…</p> : !allowed ? <div className="explore-empty"><ShieldX/><h2>Access denied</h2><p>This page requires an enabled protected administrator record.</p></div> : <>
      <button className="primary-button w-full" onClick={() => setCreating(!creating)}>{creating ? "Close Curated Find Form" : "Create Veyro Curated Find"}</button>
      {creating && <section className="admin-create-find"><p className="find-disclaimer">Administrator-created Finds publish immediately as Veyro Curated and require source metadata. Do not publish unverified places.</p><CreateFindForm submitting={submitting} onSubmit={async (input:CreateFindInput) => { if (!auth.user) return; const title = window.prompt("Authoritative source title"); const url = window.prompt("Authoritative source URL"); const informationUsed = window.prompt("What information did this source verify?"); if (!title || !url || !informationUsed) throw new Error("SOURCE_REQUIRED"); setSubmitting(true); try { await createAdminExploreFind(auth.user.uid, input, { title, url, informationUsed, sourceType:"reliable_secondary" }); setCreating(false); setTab("published"); await load("published"); } finally { setSubmitting(false); } }}/></section>}
      <div className="admin-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); void load(item); }}>{item}</button>)}</div>
      <div className="admin-find-list">{finds.length ? finds.map((find) => tab === "reported" ? <article key={find.id}><span className="status-badge">{find.status}</span><h2>Report for {find.findId}</h2><p>{find.reason} · {find.details || "No additional details"}</p><div><button onClick={() => void resolveExploreReport(find.id, "reviewing").then(() => load())}>Reviewing</button><button onClick={() => void resolveExploreReport(find.id, "resolved").then(() => load())}><Check/>Resolve</button><button onClick={() => void resolveExploreReport(find.id, "dismissed").then(() => load())}><X/>Dismiss</button></div></article>
        : tab === "source verification" ? <article key={find.id}><span className="status-badge">Admin only</span><h2>{find.findId ?? find.id}</h2><p>{find.verificationNotes}</p><p>{find.sources?.length ?? 0} recorded sources</p><div><button onClick={() => { const notes = window.prompt("Verification notes", find.verificationNotes ?? ""); if (notes) void updateAdminSourceNotes(find.id, notes).then(() => load()); }}>Edit verification notes</button></div></article>
          : <article key={find.id}><span className="status-badge">{find.status}</span><h2>{find.title}</h2><p>{find.stationName} · {find.category} · by {find.authorDisplayName}</p><p>{find.description}</p><div>{find.status === "pending" && <><button onClick={() => void action(find.id, "approve")}><Check/>Approve</button><button onClick={() => void action(find.id, "reject")}><X/>Reject</button></>}{find.status === "published" && <button onClick={() => void action(find.id, "hide")}><EyeOff/>Hide</button>}{find.status === "hidden" && <button onClick={() => void action(find.id, "restore")}><RotateCcw/>Restore</button>}<button className="danger" onClick={() => void action(find.id, "remove")}><Trash2/>Remove</button></div></article>) : <div className="explore-empty"><h2>No {tab} records</h2></div>}</div>
    </>}
  </section></AppShell>;
}
