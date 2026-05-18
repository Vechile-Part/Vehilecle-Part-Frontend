"use client";

import Image from "next/image";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export default function CustomerRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const submit = async () => {
    setLoading(true);
    setResult("");
    try {
      const body = { fullName, phone, email, password };

      const res = await fetch(`${API}/api/customers/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await parseJsonSafe(res);

      if (res.ok) {
        const id = data ?? data?.id ?? data?.customerId ?? data?.CustomerId ?? "";
        if (typeof id === "string" && id) localStorage.setItem("customerId", id);
        setResult(JSON.stringify({ success: true, id }, null, 2));
      } else {
        const message = data?.detail ?? data?.message ?? data?.title ?? res.statusText;
        setResult(JSON.stringify({ success: false, status: res.status, message }, null, 2));
      }
    } catch {
      setResult(JSON.stringify({ success: false, message: "Network or unexpected error." }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "600", margin: "0 0 8px 0", color: "#1f140b" }}>Register New Customer</h1>
            <p style={{ margin: "0", color: "#5f4d38", fontSize: "14px" }}>Onboard a new client and their vehicle to the warehouse system.</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button style={{ padding: "10px 20px", border: "1px solid #dccbb1", background: "transparent", cursor: "pointer", borderRadius: "6px", fontSize: "14px", fontWeight: "500", color: "#5f4d38" }}>Cancel</button>
            <button onClick={submit} disabled={loading || !agree} style={{ padding: "10px 24px", background: "#3d2817", color: "#fff", border: "none", cursor: "pointer", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}>{loading ? "Registering…" : "Register"}</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "24px", alignItems: "flex-start" }}>
        <div style={{ background: "#fff", border: "1px solid #dccbb1", borderRadius: "8px", padding: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Image src="/assets/parts.png" alt="Vehicle Parts" width={560} height={360} style={{ maxWidth: "100%", height: "auto", maxHeight: "400px" }} />
        </div>

        <div style={{ background: "#fff", border: "1px solid #dccbb1", borderRadius: "8px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "20px" }}>👤</span>
            <h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#1f140b" }}>Customer Information</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Full Name</label>
              <input placeholder="e.g. Jonathan Aris" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Email Address</label>
                <input placeholder="j.aris@example.c" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Phone Number</label>
                <input placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Password</label>
              <input placeholder="••••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#9b876c" }}>Must contain at least 8 characters, one uppercase, and one number.</p>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px", fontSize: "14px", color: "#5f4d38", cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>
      </div>

      <div style={{ background: "#FFF5E6", border: "1px solid #F0DCC8", borderRadius: "8px", padding: "16px", display: "flex", gap: "12px", marginBottom: "24px" }}>
        <span style={{ fontSize: "20px", minWidth: "24px" }}>ℹ️</span>
        <div>
          <p style={{ margin: "0 0 4px 0", fontWeight: "600", color: "#1f140b", fontSize: "14px" }}>Verification Required</p>
          <p style={{ margin: "0", color: "#5f4d38", fontSize: "13px" }}>Ensure all contact details match official records for proper account security and liability coverage.</p>
        </div>
      </div>

      <div style={{ background: "#6b6056", color: "#fff", borderRadius: "8px", padding: "32px", textAlign: "center", marginBottom: "24px" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "13px", opacity: "0.8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Automated Registration</p>
        <p style={{ margin: "0", fontSize: "16px", lineHeight: "1.5" }}>New registrations are automatically synced with the global inventory and service history logs.</p>
      </div>

      {result && (
        <div style={{ background: "#f5f1e8", border: "1px solid #dccbb1", borderRadius: "6px", padding: "16px", marginBottom: "24px" }}>
          <pre style={{ margin: "0", fontSize: "12px", color: "#1f140b", overflow: "auto", maxHeight: "200px", fontFamily: "monospace" }}>{result}</pre>
        </div>
      )}
    </main>
  );
}
