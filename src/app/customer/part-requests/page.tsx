"use client";
import { useState } from "react";

export default function RequestPart() {
  const [customerId, setCustomerId] = useState("");
  const [partName, setPartName] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("http://localhost:5019/api/customers/part-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, partName, notes }),
    });
    if (res.ok) setMessage("Part request submitted successfully!");
    else setMessage("Something went wrong. Please try again.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", width: "100%", maxWidth: "480px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", color: "#111" }}>Request a Part</h1>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>Can't find a part? Request it here</p>

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Customer ID</label>
        <input type="text" placeholder="Enter your customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "16px", fontSize: "15px", boxSizing: "border-box" }} />

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Part Name</label>
        <input type="text" placeholder="Enter part name" value={partName} onChange={e => setPartName(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "16px", fontSize: "15px", boxSizing: "border-box" }} />

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Notes</label>
        <textarea placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "24px", fontSize: "15px", boxSizing: "border-box", resize: "none" }} />

        <button onClick={handleSubmit}
          style={{ width: "100%", padding: "12px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
          Submit Request
        </button>

        {message && (
          <p style={{ marginTop: "16px", textAlign: "center", color: message.includes("successfully") ? "#16a34a" : "#dc2626" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
