"use client";
import { useState } from "react";
import { Star } from "lucide-react";

export default function SubmitReview() {
  const [customerId, setCustomerId] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("http://localhost:5019/api/customers/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, rating, comment }),
    });
    if (res.ok) setMessage("Review submitted successfully!");
    else setMessage("Something went wrong. Please try again.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", width: "100%", maxWidth: "480px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", color: "#111" }}>Review Service</h1>
        <p style={{ color: "#6b7280", marginBottom: "24px" }}>Share your experience with us</p>

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Customer ID</label>
        <input type="text" placeholder="Enter your customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "16px", fontSize: "15px", boxSizing: "border-box" }} />

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Rating</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} size={32} onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
              fill={(hovered || rating) >= star ? "#f59e0b" : "none"}
              color={(hovered || rating) >= star ? "#f59e0b" : "#d1d5db"}
              style={{ cursor: "pointer" }} />
          ))}
        </div>

        <label style={{ display: "block", marginBottom: "6px", fontWeight: "500", color: "#374151" }}>Comment</label>
        <textarea placeholder="Write your review..." value={comment} onChange={e => setComment(e.target.value)} rows={4}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "24px", fontSize: "15px", boxSizing: "border-box", resize: "none" }} />

        <button onClick={handleSubmit}
          style={{ width: "100%", padding: "12px", background: "#111", color: "#fff", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
          Submit Review
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
