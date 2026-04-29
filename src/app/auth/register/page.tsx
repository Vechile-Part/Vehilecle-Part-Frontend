"use client";

import { useState } from "react";

export default function CustomerRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    const res = await fetch("http://localhost:5020/api/customers/self-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, email, password }),
    });
    if (res.ok) {
      const text = await res.text();
      if (text) {
        try {
          const id = JSON.parse(text) as string;
          if (id) localStorage.setItem("customerId", id);
        } catch {
          // ignore parsing failures
        }
      }
      setMessage("Customer registered successfully.");
    } else setMessage("Registration failed.");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Customer Registration</h1>
        <p className="form-subtitle">Create a customer account to start using the portal.</p>
        <div className="form-grid">
          <input className="form-input" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="form-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="form-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="form-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="form-button" onClick={submit}>Register</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
