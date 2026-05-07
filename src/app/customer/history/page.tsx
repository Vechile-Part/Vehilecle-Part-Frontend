"use client";
import { useState } from "react";

interface Invoice {
  id: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
}
const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
};

export default function PurchaseHistory() {
    const [customerId, setCustomerId] = useState("");  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:5020/api/customers/${customerId}/history/purchases`);
    const data = await parseJsonSafe(res);
    setInvoices(data);
    setSearched(true);
    setLoading(false);
  };

  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Purchase History</h1>
        <p className="form-subtitle">View your past purchases and service history.</p>
        <div className="form-row">
          <input className="form-input" type="text" placeholder="Customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          <button className="form-button" onClick={handleSearch}>{loading ? "Loading..." : "Search"}</button>
        </div>

        {searched && invoices.length === 0 && <p className="form-message">No purchase history found.</p>}

        {invoices.map(invoice => (
          <div key={invoice.id} className="result-pre">
            <p><strong>Date:</strong> {new Date(invoice.issuedAtUtc).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> Rs. {invoice.totalAmount.toFixed(2)}</p>
            {invoice.discountAmount > 0 && <p><strong>Discount:</strong> - Rs. {invoice.discountAmount.toFixed(2)}</p>}
            <p><strong>Paid:</strong> Rs. {invoice.paidAmount.toFixed(2)}</p>
            {invoice.pendingCredit > 0 && <p><strong>Pending:</strong> Rs. {invoice.pendingCredit.toFixed(2)}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}
