"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { isStaffToken } from "@/lib/jwtRole";

const API = API_BASE_URL;

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export default function StaffRegisterClient() {
  const [gate, setGate] = useState<"loading" | "ok" | "denied">("loading");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(2024);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token && isStaffToken(token)) setGate("ok");
    else setGate("denied");
  }, []);

  const submit = async () => {
    setLoading(true);
    setResult("");
    try {
      const body = {
        fullName,
        phone,
        email,
        vehicleNumber,
        make,
        model,
        year: Number(year),
      };

      const res = await fetch(`${API}/api/staff/customers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      const data = await parseJsonSafe(res);

      if (res.ok) {
        const id = data?.customerId ?? data?.CustomerId ?? data?.id ?? data?.Id ?? "";
        setResult(JSON.stringify({ success: true, id, message: data?.message ?? data?.Message ?? "Customer registered." }, null, 2));
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

  if (gate === "loading") {
    return (
      <main style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
        <p style={{ color: "#5f4d38" }}>Checking access…</p>
      </main>
    );
  }

  if (gate === "denied") {
    return (
      <main style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", color: "#1f140b" }}>Sign in required</h1>
        <p style={{ color: "#5f4d38", marginTop: "12px" }}>
          This page is for registering someone else after you are signed in with the right access.
          If you are finishing setup from an email link, use that link. If you are creating your own account, use{" "}
          <Link href="/auth/register" style={{ color: "#3d2817", fontWeight: 600 }}>self-registration</Link>.
        </p>
        <p style={{ marginTop: "20px" }}>
          <Link
            href="/auth/login?next=/staff/register"
            style={{ color: "#3d2817", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "600", margin: "0 0 8px 0", color: "#1f140b" }}>Register a customer (staff)</h1>
            <p style={{ margin: "0", color: "#5f4d38", fontSize: "14px", lineHeight: 1.5 }}>
              <strong>Option B</strong> of two paths: you create the customer here; they set a password via the email link. <strong>Option A</strong> is when they sign up alone on{" "}
              <Link href="/auth/register" style={{ color: "#3d2817", fontWeight: 600 }}>self-registration</Link>.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button style={{ padding: "10px 20px", border: "1px solid #dccbb1", background: "transparent", cursor: "pointer", borderRadius: "6px", fontSize: "14px", fontWeight: "500", color: "#5f4d38" }}>Cancel</button>
            <button onClick={submit} disabled={loading} style={{ padding: "10px 24px", background: "#3d2817", color: "#fff", border: "none", cursor: "pointer", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}>{loading ? "Registering…" : "Register & Open Sale"}</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
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
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #dccbb1", borderRadius: "8px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "20px" }}>🚗</span>
            <h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#1f140b" }}>Vehicle Details</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Vehicle Number</label>
              <input placeholder="License plate" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Year</label>
                <input type="number" placeholder="2024" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Make</label>
                <input placeholder="Toyota / Ford / BMW" value={make} onChange={(e) => setMake(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#5f4d38", marginBottom: "6px", textTransform: "uppercase" }}>Model</label>
              <input placeholder="Camry SE / Mustang GT" value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #dccbb1", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
          </div>
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
        <p style={{ margin: "0 0 8px 0", fontSize: "13px", opacity: "0.8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Inventory Integration</p>
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
