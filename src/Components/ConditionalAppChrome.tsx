"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "./auth/AuthContext";

export default function ConditionalAppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [mounted, setMounted] = useState(false);
  const { loading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const authOnly =
    pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/logout";

  if (authOnly) {
    return <div className="auth-shell">{children}</div>;
  }

  if (loading || !mounted) {
    return (
      <div className="layout-body" style={{ background: "#fdfbf7", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#83512E", fontWeight: "600", fontSize: "16px" }}>Restoring secure session…</div>
      </div>
    );
  }

  return (
    <div className="layout-body">
      <Sidebar />
      <div className="layout-content">
        <main className="layout-main">{children}</main>
      </div>
    </div>
  );
}
