"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isLanding = pathname === "/";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader transparent={isLanding} />
      <main className="flex-1 relative z-10">{children}</main>
      {!isLanding && <SiteFooter />}
    </div>
  );
}
