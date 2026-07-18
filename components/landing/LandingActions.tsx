"use client";

import { useLayoutEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { VeyroBoardingPass } from "@/components/landing/VeyroBoardingPass";
import { CommunityBoardCard } from "@/components/landing/CommunityBoardCard";

export function LandingActions() {
  const noteRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (!noteRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(noteRef.current, { opacity: 0 }, {
        opacity: 1,
        duration: reduced ? 0.01 : 0.35,
        delay: reduced ? 0 : 0.32,
      });
    }, noteRef);
    return () => context.revert();
  }, []);

  return <div className="landing-actions">
    <VeyroBoardingPass/>
    <CommunityBoardCard/>
    <p ref={noteRef} className="landing-actions-privacy">
      <ShieldCheck size={17} aria-hidden="true"/>
      <span>Your tickets stay private. Only journey summaries are saved.</span>
    </p>
  </div>;
}
