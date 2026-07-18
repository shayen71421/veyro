"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  Bookmark, Check, Clock3, ExternalLink, EyeOff, Heart, MapPin, Trees, Utensils,
  Landmark, ShoppingBag, Sparkles, Camera, Dumbbell, GraduationCap, Wrench, Volume2,
} from "lucide-react";
import { categoryLabels, costLabels, environmentLabels, mapsUrl, type ExploreFind, type ExploreInteraction, type ExploreCategory, type ExploreReaction } from "@/lib/explore/types";

const icons: Record<ExploreCategory, typeof MapPin> = {
  food: Utensils, park: Trees, culture: Landmark, shopping: ShoppingBag,
  quick_activity: Sparkles, quiet_spot: Volume2, photo_spot: Camera, museum: Landmark,
  recreation: Dumbbell, student_friendly: GraduationCap, useful_service: Wrench,
};

export function ExploreFindCard({
  find, interaction, reason, compact = false, onAction, onReaction,
}: {
  find: ExploreFind;
  interaction?: ExploreInteraction;
  reason?: string;
  compact?: boolean;
  onAction?: (action: "save" | "visit" | "hide", value: boolean) => void;
  onReaction?: (reaction: ExploreReaction) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!cardRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const save = cardRef.current?.querySelector(".explore-save.active");
      const reaction = cardRef.current?.querySelector(".explore-reactions .active");
      if (save) gsap.fromTo(save, { scale:.82 }, { scale:1, duration:.3, ease:"back.out(2)" });
      if (reaction) gsap.fromTo(reaction, { opacity:.5, y:4 }, { opacity:1, y:0, duration:.25 });
    }, cardRef);
    return () => context.revert();
  }, [interaction?.saved, interaction?.reaction]);
  const Icon = icons[find.category];
  return <article ref={cardRef} className={`explore-find-card${compact ? " compact" : ""}`} data-explore-card>
    <header>
      <span className="explore-category-icon" aria-hidden="true"><Icon size={19}/></span>
      <div><span className="eyebrow">{find.authorBadge}</span><h3>{find.title}</h3></div>
      {onAction && <button className={`explore-save${interaction?.saved ? " active" : ""}`} onClick={() => onAction("save", !interaction?.saved)} aria-label={interaction?.saved ? "Remove from saved Finds" : "Save Find"} aria-pressed={Boolean(interaction?.saved)}><Bookmark size={19} fill={interaction?.saved ? "currentColor" : "none"}/></button>}
    </header>
    <p className="explore-station"><MapPin size={14}/>{find.stationName} Metro</p>
    <p className="explore-description">{find.description}</p>
    <div className="explore-badges">
      <span>{categoryLabels[find.category]}</span>
      <span><Clock3 size={13}/>{find.walkingMinutes} min {find.walkingTimeType}</span>
      <span>{costLabels[find.costType]}</span>
      <span>{environmentLabels[find.environment]}</span>
      {find.bestTimes[0] && <span>Best: {find.bestTimes[0]}</span>}
    </div>
    {reason && <p className="explore-reason"><Sparkles size={14}/>{reason}</p>}
    <footer>
      <span className="explore-love"><Heart size={15} fill="currentColor"/>{find.loveCount}</span>
      {!compact && <Link href={`/explore/find/?id=${encodeURIComponent(find.id)}`} className="explore-card-link">Details & report</Link>}
      <a href={mapsUrl(find)} target="_blank" rel="noopener noreferrer" className="explore-card-link">Maps <ExternalLink size={13}/></a>
    </footer>
    {onAction && !compact && <div className="explore-actions">
      <button className="secondary-button" onClick={() => onAction("visit", !interaction?.visited)}>{interaction?.visited ? <Check size={17}/> : <MapPin size={17}/>} {interaction?.visited ? "Visited" : "Mark as Visited"}</button>
      {!interaction?.visited && <button className="explore-ghost" onClick={() => onAction("hide", true)}><EyeOff size={16}/>Hide</button>}
    </div>}
    {interaction?.visited && onReaction && <div className="explore-reactions" aria-label="How was it?">
      <span>How was it?</span>
      <button className={interaction.reaction === "loved" ? "active" : ""} onClick={() => onReaction(interaction.reaction === "loved" ? null : "loved")} aria-pressed={interaction.reaction === "loved"}><Heart size={16}/>Loved It</button>
      <button className={interaction.reaction === "not_for_me" ? "active" : ""} onClick={() => onReaction(interaction.reaction === "not_for_me" ? null : "not_for_me")} aria-pressed={interaction.reaction === "not_for_me"}>Not for Me</button>
    </div>}
    <span className="sr-only">Category: {categoryLabels[find.category]}</span>
  </article>;
}
