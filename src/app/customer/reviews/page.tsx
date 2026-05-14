"use client";
import "../../../styles/pages/ReviewPage.css";
import { useState, useEffect } from "react";

function ReviewPage() {

    const [appointments, setAppointments] = useState<{ id: string; serviceType: string; appointmentDate: string }[]>([]);
    const [serviceId, setServiceId] = useState("");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    useEffect(() => {
        const fetchAppointments = async () => {
            const token = localStorage.getItem("authToken");
            const customerId = localStorage.getItem("customerId");

            if (!token || !customerId) return;

            try {
                const response = await fetch(
                    `http://localhost:5020/api/customers/${customerId}/appointments`,
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setAppointments(data);
                    if (data.length > 0) setServiceId(data[0].id);
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchAppointments();
    }, []);

    const handleSubmit = async () => {

        if (!serviceId) {
            alert("Please select a service.");
            return;
        }

        if (rating === 0) {
            alert("Please select a rating.");
            return;
        }

        const token = localStorage.getItem("authToken");
        const customerId = localStorage.getItem("customerId");

        if (!token || !customerId) {
            alert("You must be logged in.");
            return;
        }

        const body = {
            serviceId: serviceId,
            rating: rating,
            comment: comment.trim() || null,
        };

        try {

            const response = await fetch(
                `http://localhost:5020/api/customers/${customerId}/reviews`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            if (response.ok) {
                alert("Review submitted! Thank you.");
                setRating(0);
                setComment("");
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    alert(data.message || "Submission failed.");
                } catch {
                    alert("Submission failed. Please try again.");
                }
            }

        } catch (error) {
            console.error(error);
            alert("Could not connect to server.");
        }
    };

    return (
        <div className="review-page">

            <h1 className="review-title">Review a Service</h1>
            <p className="review-subtitle">
                Share your experience with our service team.
            </p>

            <div className="review-card">

                <div className="review-section">
                    <label className="review-label">SELECT SERVICE</label>
                    {appointments.length === 0 ? (
                        <p className="review-no-appointments">No appointments found.</p>
                    ) : (
                        <select
                            className="review-input"
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                        >
                            {appointments.map((apt) => (
                                <option key={apt.id} value={apt.id}>
                                    {apt.serviceType} — {new Date(apt.appointmentDate).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="review-section">
                    <label className="review-label">RATING</label>
                    <div className="star-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                className={rating >= star ? "star active-star" : "star"}
                                onClick={() => setRating(star)}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                </div>

                <div className="review-section">
                    <label className="review-label">COMMENT (OPTIONAL)</label>
                    <textarea
                        className="review-textarea"
                        placeholder="Tell us about your experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                <div className="review-button-group">
                    <button
                        className="review-cancel-btn"
                        onClick={() => {
                            setRating(0);
                            setComment("");
                        }}
                    >
                        Cancel
                    </button>
                    <button className="review-submit-btn" onClick={handleSubmit}>
                        Submit Review
                    </button>
                </div>

            </div>

        </div>
    );
}

export default ReviewPage;