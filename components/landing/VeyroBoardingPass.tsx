"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import gsap from "gsap";
import { useAuth } from "@/features/auth/auth-context";
import { ErrorMessage } from "@/components/ui/error-message";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VeyroBoardingPass() {
  const auth = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const reduced = reducedMotion();
    const line = button.querySelector<HTMLElement>(".boarding-route-progress");
    const text = button.querySelectorAll<HTMLElement>("[data-boarding-copy]");
    const context = gsap.context(() => {
      gsap.fromTo(button, { opacity: 0, y: reduced ? 0 : 18 }, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0.01 : 0.48,
        ease: "power2.out",
      });
      if (line) {
        gsap.fromTo(line, { scaleX: reduced ? 0.78 : 0 }, {
          scaleX: 0.78,
          duration: reduced ? 0.01 : 0.72,
          delay: reduced ? 0 : 0.14,
          ease: "power2.inOut",
        });
      }
      if (text.length) {
        gsap.fromTo(text, { opacity: 0, y: reduced ? 0 : 7 }, {
          opacity: 1,
          y: 0,
          duration: reduced ? 0.01 : 0.3,
          stagger: reduced ? 0 : 0.055,
          delay: reduced ? 0 : 0.1,
        });
      }
    }, button);
    return () => {
      context.revert();
      gsap.killTweensOf(button);
      gsap.killTweensOf(button.querySelectorAll("*"));
    };
  }, []);

  useLayoutEffect(() => {
    if (!busy || !buttonRef.current) return;
    const reduced = reducedMotion();
    const context = gsap.context(() => {
      gsap.to(".boarding-route-progress", {
        scaleX: 1,
        duration: reduced ? 0.01 : 0.42,
        ease: "power2.inOut",
      });
      gsap.to(".boarding-station-node", {
        backgroundColor: "var(--veyro-heading)",
        boxShadow: reduced ? "none" : "0 0 18px rgba(217,156,77,.34)",
        duration: reduced ? 0.01 : 0.2,
      });
    }, buttonRef);
    return () => context.revert();
  }, [busy]);

  const animateActive = (active: boolean) => {
    const button = buttonRef.current;
    if (!button || busy || reducedMotion()) return;
    const line = button.querySelector(".boarding-route-progress");
    const arrow = button.querySelector(".boarding-action-icon");
    gsap.to(button, {
      y: active ? -4 : 0,
      borderColor: active ? "var(--veyro-gold-dark)" : "var(--veyro-border)",
      backgroundColor: active ? "var(--veyro-card-raised)" : "var(--veyro-card)",
      boxShadow: active
        ? "0 14px 34px rgba(0,0,0,.32), 0 0 22px rgba(217,156,77,.09)"
        : "var(--shadow-card)",
      duration: 0.24,
      ease: "power2.out",
      overwrite: true,
    });
    if (line) gsap.to(line, { scaleX: active ? 1 : 0.78, duration: 0.28, ease: "power2.out", overwrite: true });
    if (arrow) gsap.to(arrow, { x: active ? 5 : 0, duration: 0.24, ease: "power2.out", overwrite: true });
  };

  const animatePress = (pressed: boolean) => {
    const button = buttonRef.current;
    if (!button || busy || reducedMotion()) return;
    const node = button.querySelector(".boarding-station-node");
    gsap.to(button, { scale: pressed ? 0.985 : 1, duration: 0.1, overwrite: true });
    if (node) gsap.to(node, { filter: pressed ? "brightness(1.45)" : "brightness(1)", duration: 0.1, overwrite: true });
  };

  const board = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await auth.google();
      router.replace("/home/");
    } catch {
      setError("Google sign-in did not complete. Close the popup and try again.");
      setBusy(false);
    }
  };

  return <div className="boarding-pass-stack">
    <button
      ref={buttonRef}
      type="button"
      className="veyro-boarding-pass"
      disabled={busy}
      aria-busy={busy}
      aria-label={busy ? "Signing in to Veyro with Google" : "Start your journey with Google"}
      onClick={() => void board()}
      onMouseEnter={() => animateActive(true)}
      onMouseLeave={() => { animateActive(false); animatePress(false); }}
      onFocus={() => animateActive(true)}
      onBlur={() => animateActive(false)}
      onPointerDown={() => animatePress(true)}
      onPointerUp={() => animatePress(false)}
      onPointerCancel={() => animatePress(false)}
    >
      <span className="boarding-station-node" aria-hidden="true"/>
      <span className="boarding-route" aria-hidden="true"><i className="boarding-route-progress"/></span>
      <span className="boarding-pass-copy">
        <span className="boarding-pass-label" data-boarding-copy>VEYRO ENTRY</span>
        <strong data-boarding-copy>Start your journey</strong>
        <span className="boarding-pass-support" data-boarding-copy>
          <span className="google-g" aria-hidden="true">G</span>
          {busy ? "Boarding…" : "Continue with Google"}
        </span>
      </span>
      <span className="boarding-pass-action" aria-hidden="true">
        {busy ? <LoaderCircle className="boarding-spinner"/> : <ArrowRight className="boarding-action-icon"/>}
      </span>
      <span className="boarding-notch boarding-notch-top" aria-hidden="true"/>
      <span className="boarding-notch boarding-notch-bottom" aria-hidden="true"/>
    </button>
    {error && <ErrorMessage message={error}/>}
  </div>;
}
