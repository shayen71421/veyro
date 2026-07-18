"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CreateFindForm } from "@/components/explore/CreateFindForm";
import { ExplorerEligibilityCard } from "@/components/explore/ExplorerEligibilityCard";
import { useAuth } from "@/features/auth/auth-context";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { calculateExplorerEligibility } from "@/lib/explore/calculate-explorer-eligibility";
import { submitExploreFind, type CreateFindInput } from "@/lib/explore/submissions";
import type { Journey } from "@/types";

export default function NewFindPage() {
  const auth = useAuth(); const [journeys, setJourneys] = useState<Journey[]>([]); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (!auth.user) return; void getAllJourneys(auth.user.uid).then(setJourneys).finally(() => setLoading(false)); }, [auth.user]);
  const eligibility = useMemo(() => calculateExplorerEligibility(journeys), [journeys]);
  const submit = async (input: CreateFindInput) => { if (!auth.user) return; setSubmitting(true); try { await submitExploreFind(auth.user.uid, auth.displayName, input); setSubmitted(true); } finally { setSubmitting(false); } };
  return <AppShell><section className="page explore-page"><header className="subpage-header"><Link href="/explore/" className="text-link">← Explore</Link><span className="eyebrow">Local Explorer</span><h1>Share a Veyro Find</h1><p>Useful, real places near operational Kochi Metro stations. Every submission is reviewed before publication.</p></header>
    {loading ? <p className="muted">Checking Local Explorer eligibility…</p> : submitted ? <div className="submission-success"><CheckCircle2/><span className="eyebrow">Submitted</span><h2>Find submitted for review</h2><p>A Veyro administrator will review the location before it appears in Explore.</p><Link href="/explore/my-finds/" className="primary-button">View My Finds</Link></div> : eligibility.eligible ? <CreateFindForm submitting={submitting} onSubmit={submit}/> : <ExplorerEligibilityCard eligibility={eligibility}/>}
  </section></AppShell>;
}
