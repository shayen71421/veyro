"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LogOut, Pencil, ShieldCheck, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { StatCard } from "@/components/journeys/stat-card";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAuth } from "@/features/auth/auth-context";
import { getAllJourneys } from "@/features/journeys/journey-service";
import { demoJourneys } from "@/features/journeys/demo-data";
import type { Journey } from "@/types";
import { useScannerStore } from "@/features/scanner/scanner-context";
import { publicDisplayNameSchema } from "@/lib/validation/schemas";

export default function ProfilePage() {
  const auth = useAuth();
  const scanner = useScannerStore();
  const [journeys, setJourneys] = useState<Journey[]>(auth.demo ? demoJourneys : []);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(auth.displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.user && !auth.demo) void getAllJourneys(auth.user.uid).then(setJourneys);
  }, [auth.user, auth.demo]);

  const totals = useMemo(() => ({
    journeys: journeys.length,
    distanceKm: journeys.reduce((sum, journey) => sum + journey.distanceKm, 0),
  }), [journeys]);

  const saveName = async () => {
    const parsed = publicDisplayNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid display name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await auth.updatePublicDisplayName(parsed.data);
      setEditing(false);
    } catch {
      setError("We could not update your display name. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return <AppShell><section className="page">
    <header className="profile-header">
      <ProfileAvatar displayName={auth.displayName} photoURL={auth.photoURL} large/>
      <span className="google-photo-note">{auth.photoURL ? "Photo from your Google account" : "Google account has no profile photo"}</span>
      {editing ? <div className="profile-name-editor">
        <label htmlFor="public-display-name">Public display name</label>
        <div>
          <input id="public-display-name" value={name} maxLength={30} autoFocus onChange={(event) => setName(event.target.value)}/>
          <button className="icon-button small success" disabled={saving} onClick={() => void saveName()} aria-label="Save display name"><Check/></button>
          <button className="icon-button small" disabled={saving} onClick={() => {
            setName(auth.displayName);
            setEditing(false);
            setError("");
          }} aria-label="Cancel editing"><X/></button>
        </div>
      </div> : <div className="profile-name">
        <h1>{auth.displayName}</h1>
        <button onClick={() => setEditing(true)} aria-label="Edit public display name"><Pencil size={16}/></button>
      </div>}
      <p>{auth.user?.email}</p>
      {error && <ErrorMessage message={error}/>}
    </header>
    <div className="stats-grid">
      <StatCard value={totals.journeys} label="journeys"/>
      <StatCard value={`${totals.distanceKm.toFixed(1)} km`} label="travelled"/>
    </div>
    <div className="card privacy-card">
      <ShieldCheck className="text-accent"/>
      <div>
        <h2>Privacy by design</h2>
        <p>Ticket images are processed in your browser and never uploaded. Your profile photo comes directly from your Google account.</p>
      </div>
    </div>
    <button className="secondary-button danger w-full" onClick={() => {
      scanner.clearScan();
      void auth.logout();
    }}><LogOut size={18}/>Log out</button>
    <p className="version">Veyro Phase 1 · 0.1.0</p>
  </section></AppShell>;
}
