"use client";

import Link from "next/link";
import { ArrowRight, Compass, Home, ScanLine, ShieldCheck, Trophy } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { BrandMark } from "@/components/ui/brand-mark";
import { SiteDisclaimer } from "@/components/ui/site-disclaimer";
import { useAuth } from "@/features/auth/auth-context";

export default function LandingPage() {
  const ref = useRef<HTMLElement>(null);
  const { user, loading, displayName } = useAuth();
  const signedIn = !loading && Boolean(user);
  const firstName = displayName.trim().split(/\s+/u)[0] || "rider";

  useLayoutEffect(() => {
    if (!ref.current) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      const path = ref.current?.querySelector<SVGPathElement>(".hero-route path");
      if (path) {
        const length = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray:length, strokeDashoffset:length }, {
          strokeDashoffset:0, duration:reduce ? .01 : 1.7, ease:"power2.inOut",
        });
      }
      gsap.fromTo("[data-hero]", { opacity:0, y:reduce ? 0 : 18 }, {
        opacity:1, y:0, stagger:reduce ? 0 : .12, duration:reduce ? .01 : .65,
      });
    }, ref);
    return () => context.revert();
  }, []);

  return <main ref={ref} className="landing">
    <nav data-hero>
      <span className="brand"><BrandMark/>Veyro</span>
      <div className="landing-nav-actions">
        <Link href="/leaderboard/" className="text-link"><Trophy size={17}/>Leaderboard</Link>
        {loading
          ? <span className="landing-auth-placeholder" aria-label="Checking sign-in status"/>
          : <Link href={signedIn ? "/home/" : "/login/"} className="text-link">
            {signedIn && <Home size={17}/>}
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>}
      </div>
    </nav>

    <section className="hero">
      <div>
        <span data-hero className="eyebrow">
          {signedIn ? `Welcome back, ${firstName}` : "Independent metro travel journal"}
        </span>
        <h1 data-hero>
          {signedIn ? <>Your metro story<br/><em>keeps moving.</em></> : <>Every ride<br/><em>leaves a mark.</em></>}
        </h1>
        <p data-hero>
          {signedIn
            ? "Your journey journal is ready. Continue your story or discover something around the metro network."
            : "Scan your metro ticket, save the journey and build your personal travel story."}
        </p>
        <div data-hero className="hero-actions">
          {loading ? <span className="primary-button landing-loading-action">Checking your journey…</span> : signedIn ? <>
            <Link href="/home/" className="primary-button">Open Dashboard <ArrowRight size={18}/></Link>
            <Link href="/explore/" className="secondary-button"><Compass size={18}/>Explore Kochi</Link>
          </> : <>
            <Link href="/register/" className="primary-button">Continue with Google <ArrowRight size={18}/></Link>
            <Link href="/login/" className="secondary-button">Sign in</Link>
          </>}
        </div>
      </div>

      <div className="hero-visual" data-hero>
        <svg className="hero-route" viewBox="0 0 420 430">
          <path d="M28 380 C105 360 74 275 157 257 S238 305 278 224 S265 80 389 40"/>
          <g><circle cx="28" cy="380" r="9"/><circle cx="157" cy="257" r="9"/><circle cx="278" cy="224" r="9"/><circle cx="389" cy="40" r="9"/></g>
        </svg>
        <div className="floating-card one">
          {signedIn ? <><Home/>Your journal is ready</> : <><ScanLine/>One scan, one story</>}
        </div>
        <div className="floating-card two">
          {signedIn ? <><Compass/>Discover Veyro Finds</> : <><ShieldCheck/>Processed privately</>}
        </div>
      </div>
    </section>
    <SiteDisclaimer className="landing-disclaimer"/>
  </main>;
}
