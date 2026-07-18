"use client";

import { useAuth } from "@/features/auth/auth-context";
import { AuthGuard } from "./auth-guard";
import { BottomNavigation } from "./bottom-navigation";

export function AppShell({
  children,
  hideNav = false,
  publicAccess = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
  publicAccess?: boolean;
}) {
  const { user, loading } = useAuth();
  const content = <>
    <main className={`app-shell ${hideNav || (publicAccess && !user) ? "pb-safe" : ""}`}>{children}</main>
    {!hideNav && (!publicAccess || (!loading && user)) && <BottomNavigation/>}
  </>;

  return publicAccess ? content : <AuthGuard>{content}</AuthGuard>;
}
