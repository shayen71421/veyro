"use client";
import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";

export function useGsapEntrance(ref: RefObject<HTMLElement | null>, selector = "[data-animate]") {
  useLayoutEffect(() => {
    if (!ref.current) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => { gsap.fromTo(selector, { opacity: 0, y: reduce ? 0 : 18 }, { opacity: 1, y: 0, duration: reduce ? 0.01 : 0.55, stagger: reduce ? 0 : 0.08, ease: "power2.out" }); }, ref);
    return () => context.revert();
  }, [ref, selector]);
}
