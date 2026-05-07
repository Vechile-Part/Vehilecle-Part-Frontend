"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API = "http://localhost:5020";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setMessage("Login failed. Check credentials or backend login endpoint.");
        return;
      }

      const text = await res.text();
      if (!text) {
        setMessage("Login succeeded.");
        return;
      }

      try {
        const data = JSON.parse(text) as { token?: string; customerId?: string; userId?: string; id?: string };
        if (data?.token) {
          localStorage.setItem("authToken", data.token);
        }
        const sessionId = data?.customerId || data?.userId || data?.id;
        if (sessionId) localStorage.setItem("customerId", sessionId);
        if (data?.token || sessionId) {
          setMessage("Login succeeded.");
          router.push("/customer/profile");
        } else {
          setMessage("Login response received.");
        }
      } catch {
        setMessage("Login succeeded.");
        router.push("/customer/profile");
      }
    } catch {
      setMessage("Login failed. Server is unreachable.");
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
