"use client";
import "../../../styles/pages/ReviewPage.css";
import { useState, useEffect } from "react";
import { apiFetch, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";

type ReviewableAppointment = {
  id: string;
  serviceType: string;
  appointmentDate: string;
};

const mapAppointment = (row: unknown): ReviewableAppointment | null => {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  return {
    id,
    serviceType: String(record.serviceType ?? record.ServiceType ?? "Service"),
    appointmentDate: String(record.appointmentDate ?? record.AppointmentDate ?? ""),
  };
};

function ReviewPage() {
  const [appointments, setAppointments] = useState<ReviewableAppointment[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const canReview = appointments.length > 0;

  useEffect(() => {
    const fetchReviewableAppointments = async () => {
      const customerId = readCustomerIdFromSession();
      if (!customerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiFetch(`/api/customers/${customerId}/appointments/reviewable`);
        const data = await parseJsonSafe(response);
        if (response.ok && Array.isArray(data)) {
          const rows = data.map(mapAppointment).filter((row): row is ReviewableAppointment => row !== null);
          setAppointments(rows);
          setServiceId(rows[0]?.id ?? "");
        } else {
          setAppointments([]);
          setServiceId("");
        }
      } catch (error) {
        console.error(error);
        setAppointments([]);
        setServiceId("");
      } finally {
        setLoading(false);
      }
    };

    void fetchReviewableAppointments();
  }, []);

  const handleSubmit = async () => {
    if (!canReview) {
      setStatus({
        tone: "error",
        text: "You can only review a service after staff marks your visit as completed.",
      });
      return;
    }

    if (!serviceId) {
      setStatus({ tone: "error", text: "Please select a completed service." });
      return;
    }

    if (rating === 0) {
      setStatus({ tone: "error", text: "Please select a rating." });
      return;
    }

    const customerId = readCustomerIdFromSession();
    if (!customerId) {
      setStatus({ tone: "error", text: "You must be logged in." });
      return;
    }

    setStatus(null);

    const body = {
      serviceId,
      rating,
      comment: comment.trim() || null,
    };

    try {
      const response = await apiFetch(`/api/customers/${customerId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await parseJsonSafe(response);
      if (response.ok) {
        setStatus({ tone: "success", text: "Review submitted. Thank you." });
        setRating(0);
        setComment("");
        setAppointments((prev) => {
          const next = prev.filter((apt) => apt.id !== serviceId);
          setServiceId(next[0]?.id ?? "");
          return next;
        });
      } else {
        setStatus({ tone: "error", text: extractApiError(data, "Submission failed. Please try again.") });
      }
    } catch (error) {
      console.error(error);
      setStatus({ tone: "error", text: "Could not connect to server." });
    }
  };

  return (
    <div className="review-page">
      <h1 className="review-title">Review a Service</h1>
      <p className="review-subtitle">
        Share your experience after staff marks your service appointment as completed.
      </p>

      <div className="review-card">
        {status && (
          <p className={`purchase-invoice-status ${status.tone}`} style={{ marginBottom: "1rem" }}>
            {status.text}
          </p>
        )}

        <div className="review-section">
          <label className="review-label">SELECT COMPLETED SERVICE</label>
          {loading ? (
            <p className="review-no-appointments">Loading services…</p>
          ) : !canReview ? (
            <p className="review-no-appointments">
              You have no completed services to review yet. After your visit, staff will mark the appointment completed
              and it will appear here.
            </p>
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
                type="button"
                disabled={!canReview}
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
            disabled={!canReview}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="review-button-group">
          <button
            type="button"
            className="review-cancel-btn"
            disabled={!canReview}
            onClick={() => {
              setRating(0);
              setComment("");
            }}
          >
            Cancel
          </button>
          <button type="button" className="review-submit-btn" disabled={!canReview} onClick={() => void handleSubmit()}>
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;
