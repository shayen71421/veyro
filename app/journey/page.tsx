"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Download, Home } from "lucide-react";
import { toPng } from "html-to-image";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/layout/app-shell";
import { JourneyShareCard } from "@/components/journeys/journey-share-card";
import { useScannerStore } from "@/features/scanner/scanner-context";
import { getFirebaseClient } from "@/lib/firebase/client";
import type { Journey } from "@/types";
import { useGsapEntrance } from "@/hooks/use-gsap-entrance";

function JourneyContent() {
  const store = useScannerStore();
  const [journey, setJourney] = useState<Journey | null>(store.result);
  const search = useSearchParams();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  useGsapEntrance(pageRef);

  useEffect(() => {
    const id = search.get("id");
    const client = getFirebaseClient();
    if (!journey && id && client) {
      void getDoc(doc(client.db, "journeys", id)).then((snapshot) => {
        if (snapshot.exists()) setJourney({ id: snapshot.id, ...snapshot.data() } as Journey);
      });
    }
  }, [search, journey]);

  const share = async () => {
    if (!cardRef.current || !journey) return;
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#181613",
    });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `veyro-journey-${journey.id}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "My Veyro journey", files: [file] });
    } else {
      const link = document.createElement("a");
      link.download = file.name;
      link.href = dataUrl;
      link.click();
    }
  };

  if (!journey) {
    return <AppShell><section className="page center">
      <h1>Journey not found</h1>
      <button className="primary-button mt-6" onClick={() => router.replace("/journeys/")}>View journeys</button>
    </section></AppShell>;
  }

  return <AppShell><section ref={pageRef} className="page result-page">
    <div data-animate><span className="eyebrow">Journey added</span><h1>Another story on the line.</h1></div>
    <div ref={cardRef} data-animate><JourneyShareCard journey={journey}/></div>
    <div className="sticky-actions" data-animate>
      <button className="primary-button" onClick={() => void share()}><Download size={18}/>Share Journey</button>
      <button className="secondary-button" onClick={() => {
        store.setResult(null);
        router.replace("/home/");
      }}><Home size={18}/>Return Home</button>
    </div>
  </section></AppShell>;
}

export default function JourneyPage() {
  return <Suspense fallback={<div className="screen center">Opening journey…</div>}><JourneyContent/></Suspense>;
}
