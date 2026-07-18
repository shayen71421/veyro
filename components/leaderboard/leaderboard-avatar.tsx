"use client";

import { useState } from "react";

export function LeaderboardAvatar({ name, photoURL, large = false }: {
  name: string;
  photoURL: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return <span className={`leaderboard-avatar ${large ? "large" : ""}`} aria-hidden="true">
    {photoURL && !failed
      // Public photo visibility is explicitly controlled by the entry's showPhoto preference.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : name.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
  </span>;
}
