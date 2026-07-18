"use client";

import { useState } from "react";

export function ProfileAvatar({ displayName, photoURL, large = false }: {
  displayName: string; photoURL: string | null; large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoURL) && !failed;
  return <div className={`avatar ${large ? "large" : ""}`} aria-label={`${displayName}'s Google profile photo`}>
    {showPhoto
      // Firebase Authentication supplies this URL from the signed-in Google account.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={photoURL ?? ""} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : displayName.charAt(0).toUpperCase() || "V"}
  </div>;
}
