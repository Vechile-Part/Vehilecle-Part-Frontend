"use client";

import { Suspense } from "react";
import { StaffCustomersPageContent } from "./StaffCustomersPageContent";

export default function StaffCustomersPage() {
  return (
    <Suspense
      fallback={
        <section className="customer-directory-page">
          <div className="customer-directory-utility-row">
            <div className="customer-directory-status info">Loading customer directory...</div>
          </div>
        </section>
      }
    >
      <StaffCustomersPageContent />
    </Suspense>
  );
}
