"use client";
import { useState } from "react";

const API = "http://localhost:5020";
const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export default function StaffCustomersPage() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    vehicleNumber: "",
    make: "",
    model: "",
    year: 2020,
  });
  const [search, setSearch] = useState({ vehicleNumber: "", phone: "", fullName: "" });
  const [result, setResult] = useState("");

  const registerCustomer = async () => {
    const res = await fetch(`${API}/api/staff/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setResult(res.ok ? "Customer registered by staff" : "Registration failed");
  };

  const searchCustomers = async () => {
    const q = new URLSearchParams(search as Record<string, string>).toString();
    const res = await fetch(`${API}/api/staff/customers/search?${q}`);
    const data = await parseJsonSafe(res);
    setResult(JSON.stringify(data, null, 2));
  };

  const getReport = async () => {
    const res = await fetch(`${API}/api/staff/customer-reports`);
    const data = await parseJsonSafe(res);
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <main className="form-page">
      <section className="form-card">
      <h1 className="form-title">Staff: Customer Management</h1>
      <h2 className="form-section-title">Register Customer + Vehicle</h2>
      <div className="form-grid">
        {Object.entries(form).map(([k, v]) => (
          <input className="form-input" key={k} placeholder={k} value={String(v)} onChange={(e) => setForm({ ...form, [k]: k === "year" ? Number(e.target.value) : e.target.value })} />
        ))}
        <button className="form-button" onClick={registerCustomer}>Register</button>
      </div>
      <h2 className="form-section-title">Search Customers</h2>
      <div className="form-grid">
        <input className="form-input" placeholder="vehicleNumber" value={search.vehicleNumber} onChange={(e) => setSearch({ ...search, vehicleNumber: e.target.value })} />
        <input className="form-input" placeholder="phone" value={search.phone} onChange={(e) => setSearch({ ...search, phone: e.target.value })} />
        <input className="form-input" placeholder="fullName" value={search.fullName} onChange={(e) => setSearch({ ...search, fullName: e.target.value })} />
        <button className="form-button" onClick={searchCustomers}>Search</button>
        <button className="form-button secondary" onClick={getReport}>Get Customer Report</button>
      </div>
      <pre className="result-pre">{result}</pre>
    </section>
    </main>
  );
}
