"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ConditionalAppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authOnly =
    pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/logout";

  if (authOnly) {
    return <div className="auth-shell">{children}</div>;
  }

  return (
    <div className="layout-body">
      {mounted ? <Sidebar /> : null}
      <div className="layout-content">
        <main className="layout-main">{children}</main>
      </div>
    </div>
  );
}
