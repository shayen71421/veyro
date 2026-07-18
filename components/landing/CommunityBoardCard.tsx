"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import gsap from "gsap";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CommunityBoardCard() {
  const ref = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const reduced = reducedMotion();
    const context = gsap.context(() => {
      gsap.fromTo(card, { opacity: 0, y: reduced ? 0 : 12 }, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0.01 : 0.38,
        delay: reduced ? 0 : 0.18,
        ease: "power2.out",
      });
    }, ref);
    return () => {
      context.revert();
      gsap.killTweensOf(card);
      gsap.killTweensOf(card.querySelectorAll("*"));
    };
  }, []);

  const animate = (active: boolean) => {
    const card = ref.current;
    if (!card || reducedMotion()) return;
    const arrow = card.querySelector(".community-board-arrow");
    const trophy = card.querySelector(".community-board-trophy");
    gsap.to(card, {
      y: active ? -2 : 0,
      backgroundColor: active ? "var(--veyro-card)" : "var(--veyro-bg-secondary)",
      borderColor: active ? "var(--veyro-gold-dark)" : "var(--veyro-border)",
      duration: 0.22,
      overwrite: true,
    });
    if (arrow) gsap.to(arrow, { x: active ? 4 : 0, duration: 0.22, overwrite: true });
    if (trophy) gsap.to(trophy, {
      filter: active ? "brightness(1.25)" : "brightness(1)",
      rotate: active ? 3 : 0,
      duration: 0.22,
      overwrite: true,
    });
  };

  return <Link
    ref={ref}
    href="/leaderboard/"
    className="community-board-card"
    aria-label="Open the Veyro Community Leaderboard"
    onMouseEnter={() => animate(true)}
    onMouseLeave={() => animate(false)}
    onFocus={() => animate(true)}
    onBlur={() => animate(false)}
  >
    <span className="community-board-icon" aria-hidden="true"><Trophy className="community-board-trophy"/></span>
    <span className="community-board-copy">
      <small>COMMUNITY BOARD</small>
      <strong>See who is leading Veyro</strong>
      <span>Distance · Journeys · Best Streak</span>
    </span>
    <ArrowRight className="community-board-arrow" aria-hidden="true"/>
  </Link>;
}
