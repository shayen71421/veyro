"use client";

import { useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileAvatar } from "@/components/auth/profile-avatar";
import { useAuth } from "@/features/auth/auth-context";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";

export default function HomePage() {
  const { displayName, photoURL } = useAuth();
  const ref = useRef<HTMLElement>(null);
  useGsapEntrance(ref);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return <AppShell><section ref={ref} className="page">
    <header className="page-header" data-animate>
      <div>
        <span className="eyebrow">Your metro journal</span>
        <h1>{greeting}, {displayName.split(" ")[0] ?? "rider"}</h1>
        <p className="page-header-note">Every ride leaves a mark.</p>
      </div>
      <div className="page-header-actions">
        <ProfileAvatar displayName={displayName} photoURL={photoURL}/>
      </div>
    </header>
  </section></AppShell>;
}
