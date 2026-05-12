"use client";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function SubmitReview() {
  const [customerId, setCustomerId] = useState("");
  const [rating, setRating] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`${API_BASE_URL}/api/customers/${customerId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, rating, comment }),
    });
    if (res.ok) setMessage("Review submitted successfully!");
    else setMessage("Something went wrong. Please try again.");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Review Service</h1>
        <p className="form-subtitle">Share your experience with us.</p>
        <div className="form-grid">
          <input className="form-input" type="text" placeholder="Customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
          <input className="form-input" type="text" placeholder="Service ID (GUID)" value={serviceId} onChange={e => setServiceId(e.target.value)} />
          <input className="form-input" type="number" min={1} max={5} placeholder="Rating (1-5)" value={rating} onChange={e => setRating(Number(e.target.value))} />
          <textarea className="form-textarea" placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} rows={4} />
          <button className="form-button" onClick={handleSubmit}>Submit Review</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
