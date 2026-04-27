"use client";
import { useState } from "react";
import { Tag, Clock, CreditCard, AlertCircle } from "lucide-react";

interface Invoice {
  id: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
}

export default function PurchaseHistory() {
  const [customerId, setCustomerId] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:5019/api/customers/${customerId}/history`);
    const data = await res.json();
    setInvoices(data);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "40px 20px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", color: "#111" }}>Purchase History</h1>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>View your past purchases and service history</p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <input type="text" placeholder="Enter your customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)}
            style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "15px" }} />
          <button onClick={handleSearch}
            style={{ padding: "10px 24px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        {searched && invoices.length === 0 && (
          <div style={{ textAlign: "center", color: "#6b7280", padding: "40px" }}>
            No purchase history found.
          </div>
        )}

        {invoices.map(invoice => (
          <div key={invoice.id} style={{ background: "#fff", borderRadius: "12px", padding: "24px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {invoice.discountAmount > 0 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                <Tag size={14} />
                Loyalty Discount Applied — 10% Off
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={18} color="#6b7280" />
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Date</div>
                  <div style={{ fontWeight: "600", color: "#111" }}>{new Date(invoice.issuedAtUtc).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={18} color="#6b7280" />
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Amount</div>
                  <div style={{ fontWeight: "600", color: "#111" }}>Rs. {invoice.totalAmount.toFixed(2)}</div>
                </div>
              </div>
              {invoice.discountAmount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Tag size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Discount</div>
                    <div style={{ fontWeight: "600", color: "#16a34a" }}>- Rs. {invoice.discountAmount.toFixed(2)}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={18} color="#6b7280" />
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Paid</div>
                  <div style={{ fontWeight: "600", color: "#111" }}>Rs. {invoice.paidAmount.toFixed(2)}</div>
                </div>
              </div>
              {invoice.pendingCredit > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertCircle size={18} color="#dc2626" />
                  <div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Pending</div>
                    <div style={{ fontWeight: "600", color: "#dc2626" }}>Rs. {invoice.pendingCredit.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
