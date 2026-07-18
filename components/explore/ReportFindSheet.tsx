"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { reportExploreFind } from "@/lib/explore/reporting";

const reasons = {
  place_closed: "Place is permanently closed", incorrect_location: "Location is incorrect",
  unsafe_or_restricted: "Unsafe or restricted place", misleading_description: "Description is misleading",
  advertisement: "Advertisement or spam", private_information: "Contains private information", other: "Other",
} as const;

export function ReportFindSheet({ uid, findId, onClose }: { uid: string; findId: string; onClose: () => void }) {
  const [sent, setSent] = useState(false); const [sending, setSending] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!layerRef.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(".explore-sheet-backdrop", { opacity:0 }, { opacity:1, duration:reduced ? .01 : .2 });
      gsap.fromTo(".explore-sheet", { opacity:0, y:reduced ? 0 : 28 }, { opacity:1, y:0, duration:reduced ? .01 : .3, ease:"power2.out" });
    }, layerRef);
    return () => context.revert();
  }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      await reportExploreFind(uid, { findId, reason: form.get("reason"), details: form.get("details") || null });
      setSent(true);
    } finally { setSending(false); }
  };
  return <div ref={layerRef} className="explore-sheet-layer" role="dialog" aria-modal="true" aria-labelledby="report-title">
    <button className="explore-sheet-backdrop" onClick={onClose} aria-label="Close report dialog"/>
    <section className="explore-sheet">
      <button className="icon-button explore-sheet-close" onClick={onClose} aria-label="Close"><X/></button>
      {sent ? <><span className="eyebrow">Thank you</span><h2 id="report-title">Report submitted</h2><p>Veyro administrators can review this privately.</p><button className="primary-button" onClick={onClose}>Done</button></> :
      <form onSubmit={(event) => void submit(event)}><h2 id="report-title">Report this Find</h2><label>Reason<select name="reason">{Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Details (optional)<textarea name="details" maxLength={300} rows={4}/></label><button className="primary-button" disabled={sending}>{sending ? "Submitting…" : "Submit report"}</button></form>}
    </section>
  </div>;
}
