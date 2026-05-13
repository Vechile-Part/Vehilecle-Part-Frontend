"use client";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readCustomerIdFromSession = () => {
  const fromStorage = localStorage.getItem("customerId") || localStorage.getItem("userId");
  if (fromStorage) return fromStorage;

  const token = localStorage.getItem("authToken");
  if (!token) return "";

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return "";
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const payload = JSON.parse(json) as Record<string, string>;
    return payload.customerId || payload.sub || payload.nameid || payload.userId || "";
  } catch {
    return "";
  }
};

type InvoiceRow = {
  invoiceId: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
};

type AppointmentRow = {
  id: string;
  appointmentDate: string;
  serviceType: string;
  status: string;
  notes: string | null;
};

type ReviewRow = {
  id: string;
  serviceId: string;
  rating: number;
  comment: string | null;
};

type HistoryPayload = {
  customerName: string;
  invoices: InvoiceRow[];
  appointments: AppointmentRow[];
  serviceReviews: ReviewRow[];
};

export default function CustomerHistoryPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoryPayload | null>(null);

  useEffect(() => {
    const run = async () => {
      const customerId = readCustomerIdFromSession();
      const token = localStorage.getItem("authToken");
      if (!customerId || !token) {
        setLoading(false);
        setMessage("Sign in as a customer to view purchase and service history.");
        return;
      }

      const res = await fetch(`${API}/api/customer-history/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await parseJsonSafe(res);
      setLoading(false);

      if (res.status === 401 || res.status === 403) {
        setMessage("You are not allowed to view this history.");
        return;
      }

      if (!res.ok || !payload) {
        setMessage("Could not load history.");
        return;
      }

      setData({
        customerName: payload.customerName ?? "",
        invoices: Array.isArray(payload.invoices) ? payload.invoices : [],
        appointments: Array.isArray(payload.appointments) ? payload.appointments : [],
        serviceReviews: Array.isArray(payload.serviceReviews) ? payload.serviceReviews : [],
      });
    };

    void run();
  }, []);

  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Purchase and service history</h1>
        <p className="form-subtitle">
          Signed-in customers see sales invoices, workshop appointments, and submitted service reviews together.
        </p>

        {loading && <p className="form-message">Loading…</p>}
        {!loading && message && <p className="form-message">{message}</p>}

        {data && (
          <>
            <p className="form-message" style={{ marginBottom: "1rem" }}>
              {data.customerName}
            </p>

            <h2 className="form-title" style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
              Purchases
            </h2>
            {data.invoices.length === 0 && <p className="form-message">No invoices yet.</p>}
            {data.invoices.map((invoice) => (
              <div key={invoice.invoiceId} className="result-pre">
                <p>
                  <strong>Date:</strong> {new Date(invoice.issuedAtUtc).toLocaleDateString()}
                </p>
                <p>
                  <strong>Total:</strong> Rs. {invoice.totalAmount.toFixed(2)}
                </p>
                {invoice.discountAmount > 0 && (
                  <p>
                    <strong>Discount:</strong> Rs. {invoice.discountAmount.toFixed(2)}
                  </p>
                )}
                <p>
                  <strong>Paid:</strong> Rs. {invoice.paidAmount.toFixed(2)}
                </p>
                {invoice.pendingCredit > 0 && (
                  <p>
                    <strong>Outstanding:</strong> Rs. {invoice.pendingCredit.toFixed(2)}
                  </p>
                )}
              </div>
            ))}

            <h2 className="form-title" style={{ fontSize: "1.1rem", marginTop: "1.25rem" }}>
              Service appointments
            </h2>
            {data.appointments.length === 0 && <p className="form-message">No appointments on file.</p>}
            {data.appointments.map((a) => (
              <div key={a.id} className="result-pre">
                <p>
                  <strong>When:</strong> {new Date(a.appointmentDate).toLocaleString()}
                </p>
                <p>
                  <strong>Service:</strong> {a.serviceType}
                </p>
                <p>
                  <strong>Status:</strong> {a.status}
                </p>
                {a.notes && (
                  <p>
                    <strong>Notes:</strong> {a.notes}
                  </p>
                )}
              </div>
            ))}

            <h2 className="form-title" style={{ fontSize: "1.1rem", marginTop: "1.25rem" }}>
              Service reviews
            </h2>
            {data.serviceReviews.length === 0 && <p className="form-message">No reviews submitted.</p>}
            {data.serviceReviews.map((r) => (
              <div key={r.id} className="result-pre">
                <p>
                  <strong>Rating:</strong> {r.rating} / 5
                </p>
                {r.comment && (
                  <p>
                    <strong>Comment:</strong> {r.comment}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}
