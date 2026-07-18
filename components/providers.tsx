"use client";
import { useEffect } from "react";
import { AuthProvider } from "@/features/auth/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js");
    else void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
  }, []);
  return <AuthProvider>{children}</AuthProvider>;
}
