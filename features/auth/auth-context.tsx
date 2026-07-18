"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, updateProfile, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { firebaseConfigured, getFirebaseClient } from "@/lib/firebase/client";
import { publicDisplayNameSchema } from "@/lib/validation/schemas";

type AuthContextValue = {
  user: User | null; loading: boolean; demo: boolean; displayName: string; photoURL: string | null;
  google: () => Promise<void>; updatePublicDisplayName: (name: string) => Promise<void>; logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

const demoUser = { uid: "demo-user", displayName: "Shayen", email: "demo@veyro.local", photoURL: null } as User;

async function syncProfile(user: User): Promise<{ displayName: string; photoURL: string | null }> {
  const client = getFirebaseClient();
  if (!client) return { displayName: user.displayName ?? "Veyro rider", photoURL: user.photoURL };
  const ref = doc(client.db, "users", user.uid); const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    const displayName = user.displayName ?? "Veyro rider";
    await setDoc(ref, { uid: user.uid, displayName, email: user.email ?? "", photoURL: user.photoURL, createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() });
    return { displayName, photoURL: user.photoURL };
  }
  await updateDoc(ref, { photoURL: user.photoURL, lastSeenAt: serverTimestamp() });
  const savedName = snapshot.data().displayName;
  return { displayName: typeof savedName === "string" ? savedName : user.displayName ?? "Veyro rider", photoURL: user.photoURL };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [user, setUser] = useState<User | null>(demo ? demoUser : null); const [loading, setLoading] = useState(!demo && firebaseConfigured);
  const [displayName, setDisplayName] = useState(demo ? "Shayen" : "Veyro rider");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  useEffect(() => {
    if (demo) return; const client = getFirebaseClient();
    if (!client) return;
    return onAuthStateChanged(client.auth, (next) => {
      setUser(next); setDisplayName(next?.displayName ?? "Veyro rider"); setPhotoURL(next?.photoURL ?? null);
      setLoading(false);
      if (next) void syncProfile(next).then((profile) => {
        if (client.auth.currentUser?.uid === next.uid) { setDisplayName(profile.displayName); setPhotoURL(profile.photoURL); }
      });
    });
  }, [demo]);
  const requireClient = () => { const client = getFirebaseClient(); if (!client) throw new Error("FIREBASE_NOT_CONFIGURED"); return client; };
  const google = useCallback(async () => { if (demo) { setUser(demoUser); return; } await signInWithPopup(requireClient().auth, new GoogleAuthProvider()); }, [demo]);
  const updatePublicDisplayName = useCallback(async (name: string) => {
    const parsedName = publicDisplayNameSchema.parse(name);
    if (demo) { setDisplayName(parsedName); return; }
    if (!user) throw new Error("AUTH_REQUIRED");
    await updateProfile(user, { displayName: parsedName });
    await updateDoc(doc(requireClient().db, "users", user.uid), { displayName: parsedName, lastSeenAt: serverTimestamp() });
    await import("@/lib/leaderboard/sync-leaderboard-entry")
      .then(({ syncLeaderboardIdentity }) => syncLeaderboardIdentity(user.uid, parsedName, user.photoURL))
      .catch(() => undefined);
    setDisplayName(parsedName);
  }, [demo, user]);
  const logout = useCallback(async () => { if (demo) { setUser(null); return; } await signOut(requireClient().auth); }, [demo]);
  const value = useMemo(() => ({ user, loading, demo, displayName, photoURL, google, updatePublicDisplayName, logout }), [user, loading, demo, displayName, photoURL, google, updatePublicDisplayName, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider missing"); return value; }
