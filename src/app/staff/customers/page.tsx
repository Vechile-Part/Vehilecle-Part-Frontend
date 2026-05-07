"use client";
import { useState } from "react";

const API = "http://localhost:5019";

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
        password: "", 
        vehicleNumber: "",
        make: "",
        model: "",
        year: 2024,
    });
    const [search, setSearch] = useState({ vehicleNumber: "", phone: "", fullName: "" });
    const [result, setResult] = useState("");

    const registerCustomer = async () => {
        const res = await fetch(`${API}/api/staff/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            const data = await res.json();
            // Show the Customer ID as required by Feature 6
            setResult(`SUCCESS! Customer Registered.\nGenerated Customer ID: ${data.id}`);
            
            setForm({ fullName: "", phone: "", email: "", password: "", vehicleNumber: "", make: "", model: "", year: 2024 });
        } else {
            setResult("Registration failed. Please check the details.");
        }
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
                        <input
                            className="form-input"
                            key={k}
                            type={k === "password" ? "password" : "text"}
                            placeholder={k === "fullName" ? "Full Name" : k}
                            value={String(v)}
                            onChange={(e) => setForm({ ...form, [k]: k === "year" ? Number(e.target.value) : e.target.value })}
                        />
                    ))}
                    <button className="form-button" onClick={registerCustomer}>Register Customer</button>
                </div>

                <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #ddd" }} />

                <h2 className="form-section-title">Search Customers</h2>
                <div className="form-grid">
                    <input className="form-input" placeholder="Vehicle Number" value={search.vehicleNumber} onChange={(e) => setSearch({ ...search, vehicleNumber: e.target.value })} />
                    <input className="form-input" placeholder="Phone" value={search.phone} onChange={(e) => setSearch({ ...search, phone: e.target.value })} />
                    <input className="form-input" placeholder="Full Name" value={search.fullName} onChange={(e) => setSearch({ ...search, fullName: e.target.value })} />
                    <button className="form-button" onClick={searchCustomers}>Search</button>
                    <button className="form-button secondary" onClick={getReport}>Get Customer Report</button>
                </div>

                {result && (
                    <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px", borderLeft: "4px solid #4a3728" }}>
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>System Result:</h3>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "14px", fontWeight: "bold" }}>{result}</pre>
                    </div>
                )}
            </section>
        </main>
    );
}
