"use client";
import { useState } from "react";

export default function RequestPart() {
  const [customerId, setCustomerId] = useState("");
  const [partName, setPartName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`http://localhost:5020/api/customers/${customerId}/part-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partName, description }),
    });
    if (res.ok) setMessage("Part request submitted successfully!");
    else setMessage("Something went wrong. Please try again.");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Request a Part</h1>
        <p className="form-subtitle">Can't find a part? Request it here.</p>
        <div className="form-grid">
          <input className="form-input" type="text" placeholder="Customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          <input className="form-input" type="text" placeholder="Part Name" value={partName} onChange={e => setPartName(e.target.value)} />
          <textarea className="form-textarea" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          <button className="form-button" onClick={handleSubmit}>Submit Request</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
