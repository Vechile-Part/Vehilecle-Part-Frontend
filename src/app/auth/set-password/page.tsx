"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    setMessage("");
    if (!tokenFromUrl.trim()) {
      setMessage("This page needs a valid link from your invitation email.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch(`${API}/api/auth/customer/complete-invite-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromUrl.trim(), newPassword: password }),
      });
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      if (!res.ok) {
        const obj = (data ?? {}) as Record<string, unknown>;
        const err =
          (typeof data === "string" && data) ||
          (obj.message as string | undefined) ||
          (obj.Message as string | undefined) ||
          (obj.detail as string | undefined) ||
          "Could not save password.";
        setMessage(err);
        return;
      }
      setMessage("Password saved. You can sign in.");
    } catch {
      setMessage("Request failed. Check your connection and try again.");
    }
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Set your password</h1>
        <p className="form-subtitle">
          An account was started for you—choose a password to finish. If you meant to create everything yourself from scratch, use{" "}
          <Link href="/auth/register">create an account</Link> instead.
        </p>
        <div className="form-grid">
          <input
            className="form-input"
            placeholder="New password (min 8 characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <input
            className="form-input"
            placeholder="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <button type="button" className="form-button" onClick={submit}>
            Save password
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
        <p className="form-subtitle" style={{ marginTop: "1rem" }}>
          <Link href="/auth/login">Sign in</Link>
          {" · "}
          <Link href="/auth/register">Create an account yourself</Link>
        </p>
      </section>
    </main>
  );
}

export default function SetPasswordFromInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="form-page">
          <section className="form-card narrow">
            <p className="form-message">Loading…</p>
          </section>
        </main>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
