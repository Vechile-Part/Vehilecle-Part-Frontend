"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function BookAppointment() {
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`${API_BASE_URL}/api/customers/${customerId}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentDate: new Date(date).toISOString(),
        serviceType: "General Service",
        notes,
      }),
    });
    if (res.ok) setMessage("Appointment booked successfully!");
    else setMessage("Something went wrong. Please try again.");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Book Appointment</h1>
        <p className="form-subtitle">Schedule a service appointment.</p>
        <div className="form-grid">
          <input className="form-input" type="text" placeholder="Customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          <input className="form-input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          <textarea className="form-textarea" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <button className="form-button" onClick={handleSubmit}>Book Appointment</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
