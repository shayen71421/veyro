"use client";

import { useLayoutEffect, useRef } from "react";
import { Trophy, X } from "lucide-react";
import gsap from "gsap";

export function JoinLeaderboardSheet({ busy, onJoin, onClose }: {
  busy: boolean;
  onJoin: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(".leaderboard-sheet-backdrop", { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.2 });
      gsap.fromTo(".leaderboard-sheet", { opacity: 0, y: reduced ? 0 : 28 }, { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.3, ease: "power2.out" });
      const content = ref.current?.querySelectorAll(".leaderboard-sheet > *");
      if (content?.length) {
        gsap.fromTo(
          content,
          { opacity: 0, y: reduced ? 0 : 8 },
          { opacity: 1, y: 0, duration: reduced ? 0.01 : 0.22, stagger: reduced ? 0 : 0.035, delay: reduced ? 0 : 0.08 },
        );
      }
    }, ref);
    return () => context.revert();
  }, []);
  return <div ref={ref} className="leaderboard-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="join-leaderboard-title">
    <button className="leaderboard-sheet-backdrop" onClick={onClose} aria-label="Close join dialog"/>
    <section className="leaderboard-sheet">
      <button className="icon-button leaderboard-sheet-close" onClick={onClose} aria-label="Close"><X/></button>
      <Trophy className="text-accent" size={36}/>
      <h2 id="join-leaderboard-title">Join the Veyro Community Leaderboard?</h2>
      <p>Your public display name and summary travel statistics will be visible to anyone viewing the public leaderboard. Your email, tickets, QR values and journey history will remain private.</p>
      <p className="leaderboard-sheet-note">Profile-photo visibility starts off. You can change it later in Profile.</p>
      <button className="primary-button w-full" disabled={busy} onClick={onJoin}>{busy ? "Joining…" : "Join Leaderboard"}</button>
      <button className="secondary-button w-full" disabled={busy} onClick={onClose}>Not Now</button>
    </section>
  </div>;
}
