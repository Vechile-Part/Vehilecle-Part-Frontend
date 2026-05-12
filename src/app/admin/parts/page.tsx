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

export default function AdminPartsPage() {
  const [part, setPart] = useState({ name: "", partNumber: "", unitPrice: 0, quantityInStock: 0, vendorId: "" });
  const [partId, setPartId] = useState("");
  const [purchase, setPurchase] = useState({ vendorId: "", totalAmount: 0, quantity: 1 });
  const [result, setResult] = useState("");

  const loadAll = async () => {
    const res = await fetch(`${API}/api/admin/parts`);
    const data = await parseJsonSafe(res);
    setResult(JSON.stringify(data, null, 2));
  };

  const addPart = async () => {
    const res = await fetch(`${API}/api/admin/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...part, unitPrice: Number(part.unitPrice), quantityInStock: Number(part.quantityInStock) }),
    });
    setResult(res.ok ? "Part added" : "Part add failed");
  };

  const updatePart = async () => {
    const res = await fetch(`${API}/api/admin/parts/${partId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...part, unitPrice: Number(part.unitPrice), quantityInStock: Number(part.quantityInStock) }),
    });
    setResult(res.ok ? "Part updated" : "Part update failed");
  };

  const deletePart = async () => {
    const res = await fetch(`${API}/api/admin/parts/${partId}`, { method: "DELETE" });
    setResult(res.ok ? "Part deleted" : "Part delete failed");
  };

  const purchasePart = async () => {
    const res = await fetch(`${API}/api/admin/parts/${partId}/purchase?quantity=${Number(purchase.quantity)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: purchase.vendorId, totalAmount: Number(purchase.totalAmount) }),
    });
    setResult(res.ok ? "Part purchased and stock updated" : "Purchase failed");
  };

  return (
    <main className="form-page">
      <section className="form-card">
      <h1 className="form-title">Parts Management</h1>
      <div className="form-grid">
        <input className="form-input" placeholder="Name" value={part.name} onChange={(e) => setPart({ ...part, name: e.target.value })} />
        <input className="form-input" placeholder="Part Number" value={part.partNumber} onChange={(e) => setPart({ ...part, partNumber: e.target.value })} />
        <input className="form-input" type="number" placeholder="Unit Price" value={part.unitPrice} onChange={(e) => setPart({ ...part, unitPrice: Number(e.target.value) })} />
        <input className="form-input" type="number" placeholder="Quantity In Stock" value={part.quantityInStock} onChange={(e) => setPart({ ...part, quantityInStock: Number(e.target.value) })} />
        <input className="form-input" placeholder="Vendor ID" value={part.vendorId} onChange={(e) => setPart({ ...part, vendorId: e.target.value })} />
        <div className="form-row">
          <button className="form-button secondary" onClick={loadAll}>Get All Parts</button>
          <button className="form-button" onClick={addPart}>Add Part</button>
          <input className="form-input" placeholder="Part ID for update/delete" value={partId} onChange={(e) => setPartId(e.target.value)} />
          <button className="form-button" onClick={updatePart}>Update Part</button>
          <button className="form-button secondary" onClick={deletePart}>Delete Part</button>
        </div>
        <h3 className="form-section-title">Purchase Part</h3>
        <input className="form-input" placeholder="Purchase Vendor ID" value={purchase.vendorId} onChange={(e) => setPurchase({ ...purchase, vendorId: e.target.value })} />
        <input className="form-input" type="number" placeholder="Purchase Total Amount" value={purchase.totalAmount} onChange={(e) => setPurchase({ ...purchase, totalAmount: Number(e.target.value) })} />
        <input className="form-input" type="number" placeholder="Quantity" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: Number(e.target.value) })} />
        <button className="form-button" onClick={purchasePart}>Purchase</button>
      </div>
      <pre className="result-pre">{result}</pre>
      </section>
    </main>
  );
}
