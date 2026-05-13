"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

export default function ConditionalAppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const authOnly = pathname === "/auth" || pathname.startsWith("/auth/");

  if (authOnly) {
    return <div className="auth-shell">{children}</div>;
  }

  return (
    <div className="layout-body">
      <Sidebar />
      <div className="layout-content">
        <main className="layout-main">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
