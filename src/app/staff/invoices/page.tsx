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

export default function StaffInvoicesPage() {
    const [invoice, setInvoice] = useState({ customerId: "", totalAmount: "", paidAmount: "" });
    const [invoiceId, setInvoiceId] = useState("");
    const [msg, setMsg] = useState("");
    const total = Number(invoice.totalAmount) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    const discount = total > 5000 ? total * 0.1 : 0;
    const discountedTotal = total - discount;
    const pending = Math.max(0, discountedTotal - paid);

    const createInvoice = async () => {
        const res = await fetch(`${API}/api/staff/sales-invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        const res = await fetch(`${API}/api/staff/sales-invoices/${invoiceId}/send-email`, { method: "POST" });
        setMsg(res.ok ? "Invoice email sent" : "Email send failed");
    };

    return (
        <main className="form-page">
            <section className="form-card narrow">
                <h1 className="form-title">Staff: Sales Invoices</h1>
                <div className="form-grid">
                    <input className="form-input" placeholder="Customer ID" value={invoice.customerId} onChange={(e) => setInvoice({ ...invoice, customerId: e.target.value })} />
                    <input className="form-input" type="text" placeholder="Total Amount" value={invoice.totalAmount} onChange={(e) => setInvoice({ ...invoice, totalAmount: e.target.value })} />
                    <input className="form-input" type="text" placeholder="Paid Amount" value={invoice.paidAmount} onChange={(e) => setInvoice({ ...invoice, paidAmount: e.target.value })} />
                    {total > 0 && (
                        <div className="form-discount-preview">
                            {discount > 0 && <p className="form-message">Loyalty Discount: -{discount.toFixed(2)} (10% off)</p>}
                            <p className="form-message">Total after discount: {discountedTotal.toFixed(2)}</p>
                            <p className="form-message">Pending Credit: {pending.toFixed(2)}</p>
                        </div>
                    )}
                    <button className="form-button" onClick={createInvoice}>Create Invoice</button>
                    <input className="form-input" placeholder="Invoice ID" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
                    <button className="form-button secondary" onClick={sendEmail}>Send Invoice Email</button>
                </div>
                {msg && <p className="form-message">{msg}</p>}
            </section>
        </main>
    );
}
