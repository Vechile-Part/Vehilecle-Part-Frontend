"use client";
import { useState } from "react";

export default function BookAppointment() {
    const [customerId, setCustomerId] = useState("");  
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [partRequest, setPartRequest] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState("");
    const [partDescription, setPartDescription] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`http://localhost:5020/api/customers/${customerId}/appointments`, {
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
    const handlePartRequest = async () => {
        const res = await fetch(`http://localhost:5020/api/customers/${customerId}/part-requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                partName: partRequest,
                description: partDescription 
            }),
        });
        if (res.ok) setMessage("Part request submitted!");
        else setMessage("Part request failed.");
    };

    const handleReview = async () => {
        const res = await fetch(`http://localhost:5020/api/customers/${customerId}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewText, rating: Number(rating) }),
        });
        if (res.ok) setMessage("Review submitted!");
        else setMessage("Review submission failed.");
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

                <h2 className="form-section-title">Request Unavailable Part</h2>
            <div className="form-grid">
                <input className="form-input" type="text" placeholder="Part Name" value={partRequest} onChange={e => setPartRequest(e.target.value)} />
                <textarea className="form-textarea" placeholder="Describe why you need this part..." value={partDescription} onChange={e => setPartDescription(e.target.value)} rows={3} />  {/* ✅ added */}
                <button className="form-button" onClick={handlePartRequest}>Request Part</button>
            </div>
                <h2 className="form-section-title">Review a Service</h2>
                <div className="form-grid">
                    <input className="form-input" type="text" placeholder="Rating (1-5)" value={rating} onChange={e => setRating(e.target.value)} />
                    <textarea className="form-textarea" placeholder="Write your review..." value={reviewText} onChange={e => setReviewText(e.target.value)} rows={3} />
                    <button className="form-button" onClick={handleReview}>Submit Review</button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </section>
        </main>
    );
}
