"use client";
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

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("authToken");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
};

export default function StaffInvoicesPage() {
  const [invoice, setInvoice] = useState({ customerId: "", totalAmount: 0, paidAmount: 0 });
  const [invoiceId, setInvoiceId] = useState("");
  const [msg, setMsg] = useState("");

  const createInvoice = async () => {
    const res = await fetch(`${API}/api/staff/sales-invoices`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...invoice, totalAmount: Number(invoice.totalAmount), paidAmount: Number(invoice.paidAmount) }),
    });
    const data = await parseJsonSafe(res);
    if (res.ok) {
      const id = typeof data === "string" ? data : "";
      setInvoiceId(id);
      setMsg(id ? `Invoice created: ${id}` : "Invoice created");
    } else setMsg("Create invoice failed");
  };

  const sendEmail = async () => {
    const res = await fetch(`${API}/api/staff/sales-invoices/${invoiceId}/send-email`, {
      method: "POST",
      headers: authHeaders(),
    });
    setMsg(res.ok ? "Invoice email sent" : "Email send failed");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Staff: Sales Invoices</h1>
        <div className="form-grid">
          <input className="form-input" placeholder="Customer ID" value={invoice.customerId} onChange={(e) => setInvoice({ ...invoice, customerId: e.target.value })} />
          <input className="form-input" type="number" placeholder="Total Amount" value={invoice.totalAmount} onChange={(e) => setInvoice({ ...invoice, totalAmount: Number(e.target.value) })} />
          <input className="form-input" type="number" placeholder="Paid Amount" value={invoice.paidAmount} onChange={(e) => setInvoice({ ...invoice, paidAmount: Number(e.target.value) })} />
          <button className="form-button" onClick={createInvoice}>Create Invoice</button>
          <input className="form-input" placeholder="Invoice ID" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
          <button className="form-button secondary" onClick={sendEmail}>Send Invoice Email</button>
        </div>
        {msg && <p className="form-message">{msg}</p>}
      </section>
    </main>
  );
}
