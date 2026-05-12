"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) {
      setMessage("Please enter both email and password.");
      return;
    }
    try {
      const res = await fetch(`${API}/api/auth/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
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
        const detail =
          (typeof data === "string" && data) ||
          (obj.detail as string | undefined) ||
          (obj.Detail as string | undefined) ||
          (obj.message as string | undefined) ||
          (obj.Message as string | undefined) ||
          (obj.title as string | undefined) ||
          (obj.Title as string | undefined) ||
          (res.status === 401
            ? "Invalid email or password."
            : `Login failed (HTTP ${res.status} ${res.statusText}).`);
        setMessage(detail);
        return;
      }

      const obj = (data ?? {}) as { token?: string; customerId?: string; userId?: string; id?: string };
      if (obj.token) localStorage.setItem("authToken", obj.token);
      const sessionId = obj.customerId || obj.userId || obj.id;
      if (sessionId) localStorage.setItem("customerId", sessionId);
      if (obj.token || sessionId) {
        setMessage("Login succeeded.");
        router.push("/customer/profile");
      } else {
        setMessage("Login succeeded.");
        router.push("/customer/profile");
      }
    } catch (err) {
      setMessage(err instanceof Error ? `Login failed: ${err.message}` : "Login failed. Server is unreachable.");
    }
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Customer Login</h1>
        <p className="form-subtitle">Sign in to access your account and services.</p>
        <div className="form-grid">
          <input className="form-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="form-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="form-button" onClick={submit}>Login</button>
        </div>
        <p className="form-message">
          New customer? <Link href="/auth/register">Register here</Link>
        </p>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
