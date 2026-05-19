"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, authHeaders, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function StaffProfilePage() {
  const [profile, setProfile] = useState({ fullName: "", phone: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [loading, setLoading] = useState(true);

  const setStatus = (text: string, tone: "info" | "error" = "info") => {
    setMessage(text);
    setMessageTone(tone);
  };

  useEffect(() => {
    const load = async () => {
      const userId = readCustomerIdFromSession();
      if (!userId) {
        setStatus("Please sign in to view your profile.", "error");
        setLoading(false);
        return;
      }

      const res = await apiFetch("/api/staff/profile");
      const data = await parseJsonSafe(res);
      if (res.ok && data && typeof data === "object" && !Array.isArray(data)) {
        const record = data as Record<string, unknown>;
        setProfile({
          fullName: String(record.fullName ?? record.FullName ?? ""),
          phone: String(record.phone ?? record.Phone ?? ""),
          email: String(record.email ?? record.Email ?? ""),
        });
      } else {
        setStatus(extractApiError(data, "Could not load your profile."), "error");
      }
      setLoading(false);
    };
    void load();
  }, []);

  const updateProfile = async () => {
    const res = await apiFetch("/api/staff/profile", {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(profile),
    });
    setStatus(
      res.ok ? "Profile saved successfully." : extractApiError(await parseJsonSafe(res), "Profile update failed."),
      res.ok ? "info" : "error",
    );
  };

  const changePassword = async () => {
    const res = await apiFetch("/api/staff/password", {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(passwordForm),
    });
    if (res.ok) {
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setStatus("Password updated successfully.");
    } else {
      setStatus(extractApiError(await parseJsonSafe(res), "Password change failed."), "error");
    }
  };

  if (loading) {
    return (
      <main className="layout-main customer-portal-page customer-profile-page">
        <div className="customer-profile-loading">Loading your profile…</div>
      </main>
    );
  }

  const displayName = profile.fullName.trim() || "Staff member";

  return (
    <main className="layout-main customer-portal-page customer-profile-page">
      <header className="customer-profile-header">
        <h1 className="customer-profile-title">My profile</h1>
        <p className="customer-profile-subtitle">Update your contact details and password for your staff account.</p>
      </header>

      {message ? (
        <p className={`customer-profile-status customer-profile-status--${messageTone}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="customer-portal-grid">
        <aside className="customer-portal-profile-card" aria-label="Account summary">
          <div className="customer-portal-portrait-ring">
            <div className="customer-portal-portrait" aria-hidden>
              {initialsFromName(displayName)}
            </div>
          </div>
          <p className="customer-portal-name">
            <span>{displayName}</span>
          </p>
          <span className="customer-portal-tier">Staff account</span>
          <div className="customer-portal-profile-metrics">
            <div>
              <span>Email</span>
              <strong>{profile.email || "—"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{profile.phone || "—"}</strong>
            </div>
          </div>
          <Link href="/logout" className="form-button" style={{ marginTop: "1.25rem", width: "100%", textAlign: "center" }}>
            Sign out
          </Link>
        </aside>

        <div className="customer-profile-sections">
          <section className="customer-profile-panel" aria-labelledby="staff-profile-contact-heading">
            <div className="customer-profile-panel-head">
              <h2 id="staff-profile-contact-heading">Contact details</h2>
              <p>Used for account recovery and internal contact.</p>
            </div>
            <div className="customer-profile-fields">
              <div className="customer-profile-field customer-profile-field--full">
                <label htmlFor="staff-full-name">Full name</label>
                <input
                  id="staff-full-name"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="staff-email">Email</label>
                <input
                  id="staff-email"
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="staff-phone">Phone</label>
                <input
                  id="staff-phone"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="customer-profile-actions">
              <button type="button" className="form-button" onClick={() => void updateProfile()}>
                Save profile
              </button>
            </div>
          </section>

          <section className="customer-profile-panel" aria-labelledby="staff-profile-password-heading">
            <div className="customer-profile-panel-head">
              <h2 id="staff-profile-password-heading">Password</h2>
              <p>Choose a new password of at least 8 characters.</p>
            </div>
            <div className="customer-profile-fields">
              <div className="customer-profile-field">
                <label htmlFor="staff-current-password">Current password</label>
                <input
                  id="staff-current-password"
                  type="password"
                  className="form-input"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="staff-new-password">New password</label>
                <input
                  id="staff-new-password"
                  type="password"
                  className="form-input"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="customer-profile-actions">
              <button type="button" className="form-button" onClick={() => void changePassword()}>
                Update password
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
