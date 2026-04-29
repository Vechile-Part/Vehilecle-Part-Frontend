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

export default function ReportsPage() {
  const [type, setType] = useState("Monthly");
  const [out, setOut] = useState("");

  const financial = async () => {
    const res = await fetch(`${API}/api/reports/financial?type=${encodeURIComponent(type)}`);
    const data = await parseJsonSafe(res);
    setOut(JSON.stringify(data, null, 2));
  };

  const lowStock = async () => {
    const res = await fetch(`${API}/api/reports/low-stock`);
    const data = await parseJsonSafe(res);
    setOut(JSON.stringify(data, null, 2));
  };

  const topSpenders = async () => {
    const res = await fetch(`${API}/api/reports/customers/top-spenders`);
    const data = await parseJsonSafe(res);
    setOut(JSON.stringify(data, null, 2));
  };

  const adminFinancial = async () => {
    const res = await fetch(`${API}/api/admin/financial-reports/${encodeURIComponent(type)}`);
    const data = await parseJsonSafe(res);
    setOut(JSON.stringify(data, null, 2));
  };

  return (
    <main className="form-page">
      <section className="form-card">
      <h1 className="form-title">Financial Reports</h1>
      <div className="form-row">
        <input className="form-input" value={type} onChange={(e) => setType(e.target.value)} placeholder="Daily / Monthly / Yearly" />
        <button className="form-button" onClick={financial}>Get Financial Report</button>
        <button className="form-button secondary" onClick={lowStock}>Get Low Stock</button>
        <button className="form-button secondary" onClick={topSpenders}>Get Top Spenders</button>
        <button className="form-button" onClick={adminFinancial}>Admin Financial Report</button>
      </div>
      <pre className="result-pre">{out}</pre>
      </section>
    </main>
  );
}
