"use client";

import { useState } from "react";
import { Check, LogOut, Pencil, ShieldCheck, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAuth } from "@/features/auth/auth-context";
import { publicDisplayNameSchema } from "@/lib/validation/schemas";

export default function ProfilePage() {
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(auth.displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    <div className="card privacy-card">
      <ShieldCheck className="text-accent"/>
      <div>
        <h2>Privacy by design</h2>
        <p>Your profile photo comes directly from your Google account.</p>
      </div>
    </div>
    <button className="secondary-button danger w-full" onClick={() => void auth.logout()}><LogOut size={18}/>Log out</button>
    <p className="version">Veyro Phase 1 · 0.1.0</p>
  </section></AppShell>;
}
