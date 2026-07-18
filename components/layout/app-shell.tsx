"use client";

import { useAuth } from "@/features/auth/auth-context";
import { AuthGuard } from "./auth-guard";
import { BottomNavigation } from "./bottom-navigation";
import { SiteDisclaimer } from "@/components/ui/site-disclaimer";

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
    <main className={`app-shell ${hideNav || (publicAccess && !user) ? "pb-safe" : ""}`}>{children}{!hideNav && <SiteDisclaimer/>}</main>
    {!hideNav && (!publicAccess || (!loading && user)) && <BottomNavigation/>}
  </>;

  return publicAccess ? content : <AuthGuard>{content}</AuthGuard>;
}
