"use client";

import { AuthGuard } from "./auth-guard";
import { BottomNavigation } from "./bottom-navigation";

export function AppShell({
  children,
  hideNav = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  const content = <>
    <main className={`app-shell ${hideNav ? "pb-safe" : ""}`}>{children}</main>
    {!hideNav && <BottomNavigation/>}
  </>;

  return <AuthGuard>{content}</AuthGuard>;
}
