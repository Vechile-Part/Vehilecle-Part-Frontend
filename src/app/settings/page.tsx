"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getShellRoleFromToken } from "@/lib/jwtRole";

export default function SettingsPage() {
  const [roleLabel, setRoleLabel] = useState("Signed in");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const role = token ? getShellRoleFromToken(token) : null;
    if (role === "admin") setRoleLabel("Administrator");
    else if (role === "staff") setRoleLabel("Staff");
    else if (role === "customer") setRoleLabel("Customer");
  }, []);

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">System settings</h1>
        <p className="form-subtitle">Account: {roleLabel}</p>
        <p className="form-message">
          Portal preferences are managed centrally. Use the menu to open parts, POS, or customer tools for your role.
        </p>
        <Link href="/logout" className="form-button" style={{ display: "inline-block", textAlign: "center", marginTop: "1rem" }}>
          Sign out
        </Link>
      </section>
    </main>
  );
}
