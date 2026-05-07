"use client";
import { useState, useEffect } from "react";

const API = "http://localhost:5019";

export default function AdminPartsPage() {
    const [parts, setParts] = useState<any[]>([]);
    const [form, setForm] = useState({ name: "", partNumber: "", unitPrice: "", quantityInStock: "", vendorId: "" });
    const [msg, setMsg] = useState("");

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        try {
            const res = await fetch(`${API}/api/admin/parts`);
            if (res.ok) {
                const data = await res.json();
                setParts(data);
            }
        } catch (e) { console.error(e); }
    };

    const addPart = async () => {
        const res = await fetch(`${API}/api/admin/parts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, unitPrice: Number(form.unitPrice), quantityInStock: Number(form.quantityInStock) }),
        });
        if (res.ok) {
            setMsg("Part added successfully!");
            setForm({ name: "", partNumber: "", unitPrice: "", quantityInStock: "", vendorId: "" });
            loadAll();
        }
    };

    const deletePart = async (id: string) => {
        const res = await fetch(`${API}/api/admin/parts/${id}`, { method: "DELETE" });
        if (res.ok) {
            setMsg("Part deleted.");
            loadAll();
        }
    };

    return (
        <main className="form-page">
            <section className="form-card">
                <h1 className="form-title">Parts & Inventory Management</h1>

                <div className="form-grid">
                    <input className="form-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="form-input" placeholder="Part Number" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} />
                    <input className="form-input" type="number" placeholder="Unit Price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
                    <input className="form-input" type="number" placeholder="Stock Quantity" value={form.quantityInStock} onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })} />
                    <input className="form-input" placeholder="Vendor ID" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} />
                    <button className="form-button" onClick={addPart}>Add Part</button>
                </div>
                {msg && <p className="form-message">{msg}</p>}

                <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #ddd" }} />

                <h2 className="form-section-title">Current Inventory</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
                    <thead style={{ backgroundColor: "#4a3728", color: "white" }}>
                    <tr>
                        <th style={{ padding: "12px", textAlign: "left" }}>Name</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Part #</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Price</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Stock</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {parts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "12px" }}>{p.name}</td>
                            <td style={{ padding: "12px" }}>{p.partNumber}</td>
                            <td style={{ padding: "12px" }}>Rs. {p.unitPrice}</td>
                            <td style={{ padding: "12px", fontWeight: "bold", color: p.quantityInStock < 10 ? "red" : "inherit" }}>
                                {p.quantityInStock}{p.quantityInStock < 10 ? " (LOW STOCK)" : ""}
                            </td>
                            <td style={{ padding: "12px" }}>
                                <button onClick={() => deletePart(p.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer", fontWeight: "bold" }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
