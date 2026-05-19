"use client";

import { Suspense } from "react";
import { StaffCustomersPageContent } from "./StaffCustomersPageContent";

export default function StaffCustomersPage() {
  return (
    <Suspense
      fallback={
        <section className="admin-page customer-directory-page">
          <p className="admin-page-subtitle">Loading customers…</p>
        </section>
      }
    >
      <StaffCustomersPageContent />
    </Suspense>
  );
}
