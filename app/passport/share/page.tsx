"use client";

import Link from "next/link";
import { useMemo, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, MapPinned } from "lucide-react";
import { PassportShareCard } from "@/components/passport/passport-share-card";
import { decodePassportSharePayload, type PassportSharePayload } from "@/lib/insights/passport-share";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";
import { BrandMark } from "@/components/ui/brand-mark";
import { SiteDisclaimer } from "@/components/ui/site-disclaimer";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function SharedPassportContent({ summary }: { summary: PassportSharePayload }) {
  const pageRef = useRef<HTMLElement>(null);
  useGsapEntrance(pageRef);
  return <main ref={pageRef} className="shared-passport-page">
    <nav data-animate><Link href="/" className="brand"><BrandMark/>Veyro</Link><span>Shared travel recap</span></nav>
    <section data-animate>
      <span className="eyebrow">Veyro Passport</span>
      <h1>{summary.displayName}&apos;s Kochi Metro story</h1>
      <p>This is a traveller-created Veyro recap, not an official Metro record.</p>
    </section>
    <div data-animate><PassportShareCard summary={summary}/></div>
    <footer data-animate>
      <p>Want to start your own station collection?</p>
      <Link href="/" className="primary-button">Discover Veyro</Link>
    </footer>
    <SiteDisclaimer/>
  </main>;
}

export default function SharedPassportPage() {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.slice(1),
    () => null,
  );
  const summary = useMemo(() => hash === null ? undefined : decodePassportSharePayload(hash), [hash]);

  if (summary === undefined) return <main className="shared-passport-page center"><p className="muted">Opening Passport…</p><SiteDisclaimer/></main>;

  if (!summary) return <main className="shared-passport-page center">
    <span className="brand"><BrandMark/>Veyro</span>
    <MapPinned className="text-accent mt-6" size={44}/>
    <h1>This Passport link is invalid.</h1>
    <p className="muted">Ask the traveller to share a new link from their Veyro Passport.</p>
    <Link href="/" className="secondary-button mt-4"><ArrowLeft size={18}/>Visit Veyro</Link>
    <SiteDisclaimer/>
  </main>;

  return <SharedPassportContent summary={summary}/>;
}
