"use client";
import "../../../styles/pages/HistoryPage.css";
import { useState, useEffect } from "react";
import { formatNpr } from "@/lib/currency";
import { apiFetch, readCustomerIdFromSession } from "@/lib/http";

const ITEMS_PER_PAGE = 6;

type InvoiceLine = {
    partName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

type Invoice = {
    invoiceId: string;
    issuedAtUtc: string;
    totalAmount: number;
    discountAmount: number;
    paidAmount: number;
    pendingCredit: number;
    items: InvoiceLine[];
};

type Appointment = {
    id: string;
    serviceType: string;
    appointmentDate: string;
    status: string;
    notes?: string;
};

type Review = {
    id: string;
    rating: number;
    comment?: string;
};

type HistoryData = {
    invoices: Invoice[];
    appointments: Appointment[];
    serviceReviews: Review[];
};

function HistoryPage() {

    const [activeTab, setActiveTab] = useState("invoices");
    const [history, setHistory] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(true);

    const [invoicePage, setInvoicePage] = useState(1);
    const [appointmentPage, setAppointmentPage] = useState(1);
    const [reviewPage, setReviewPage] = useState(1);

    useEffect(() => {
        const fetchHistory = async () => {
            const customerId = readCustomerIdFromSession();

            if (!customerId) {
                setLoading(false);
                return;
            }

            try {
                const response = await apiFetch(`/api/customer-history/${customerId}`);

                if (response.ok) {
                    const data = await response.json();
                    const record = data as Record<string, unknown>;
                    const rawInvoices = Array.isArray(record.invoices) ? record.invoices : [];
                    const invoices = rawInvoices.map((row) => {
                        const inv = row as Record<string, unknown>;
                        const rawItems = Array.isArray(inv.items) ? inv.items : [];
                        const items = rawItems.map((line) => {
                            const item = line as Record<string, unknown>;
                            const quantity = Number(item.quantity ?? item.Quantity ?? 0);
                            const unitPrice = Number(item.unitPrice ?? item.UnitPrice ?? 0);
                            const lineTotal = Number(item.lineTotal ?? item.LineTotal ?? quantity * unitPrice);
                            return {
                                partName: String(item.partName ?? item.PartName ?? "Part"),
                                quantity,
                                unitPrice,
                                lineTotal,
                            };
                        });
                        return {
                            invoiceId: String(inv.invoiceId ?? inv.InvoiceId ?? ""),
                            issuedAtUtc: String(inv.issuedAtUtc ?? inv.IssuedAtUtc ?? ""),
                            totalAmount: Number(inv.totalAmount ?? inv.TotalAmount ?? 0),
                            discountAmount: Number(inv.discountAmount ?? inv.DiscountAmount ?? 0),
                            paidAmount: Number(inv.paidAmount ?? inv.PaidAmount ?? 0),
                            pendingCredit: Number(inv.pendingCredit ?? inv.PendingCredit ?? 0),
                            items,
                        };
                    });
                    setHistory({
                        invoices,
                        appointments: Array.isArray(record.appointments) ? record.appointments : [],
                        serviceReviews: Array.isArray(record.serviceReviews) ? record.serviceReviews : [],
                    } as HistoryData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    function paginate<T>(items: T[], page: number) {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return items.slice(start, start + ITEMS_PER_PAGE);
    }

    function PaginationControls({ currentPage, totalItems, onPageChange }: {
        currentPage: number;
        totalItems: number;
        onPageChange: (page: number) => void;
    }) {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <div className="pagination">
                <button
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i + 1}
                        className={`page-btn ${currentPage === i + 1 ? "active-page" : ""}`}
                        onClick={() => onPageChange(i + 1)}
                    >
                        {i + 1}
                    </button>
                ))}

                <button
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next →
                </button>
            </div>
        );
    }

    if (loading) return <div className="history-page"><p>Loading...</p></div>;
    if (!history) return <div className="history-page"><p>You are not allowed to view this history.</p></div>;

    return (
        <div className="history-page">

            <h1 className="history-title">My History</h1>
            <p className="history-subtitle">View your past invoices, appointments and reviews.</p>

            <div className="history-tabs">
                <button
                    className={activeTab === "invoices" ? "history-tab active-tab" : "history-tab"}
                    onClick={() => setActiveTab("invoices")}
                >
                    Invoices
                </button>
                <button
                    className={activeTab === "appointments" ? "history-tab active-tab" : "history-tab"}
                    onClick={() => setActiveTab("appointments")}
                >
                    Appointments
                </button>
                <button
                    className={activeTab === "reviews" ? "history-tab active-tab" : "history-tab"}
                    onClick={() => setActiveTab("reviews")}
                >
                    Reviews
                </button>
            </div>

            {/* INVOICES */}
            {activeTab === "invoices" && (
                <div className="history-section">
                    {history.invoices.length === 0 ? (
                        <p className="history-empty">No invoices found.</p>
                    ) : (
                        <>
                            {paginate<Invoice>(history.invoices, invoicePage).map((inv) => (
                                <div key={inv.invoiceId} className="history-card">
                                    <div className="history-card-header">
                                        <div>
                                            <p className="history-card-date-small">{new Date(inv.issuedAtUtc).toLocaleDateString()}</p>
                                            <p className="history-card-amount">{formatNpr(inv.totalAmount)}</p>
                                        </div>
                                        <span className="history-invoice-ref">#{inv.invoiceId.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    {inv.items.length > 0 && (
                                        <ul className="history-invoice-items">
                                            {inv.items.map((item) => (
                                                <li key={`${inv.invoiceId}-${item.partName}-${item.quantity}`}>
                                                    {item.partName} × {item.quantity} — {formatNpr(item.lineTotal)}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="history-card-row">
                                        <span className="history-card-label">Date</span>
                                        <span>{new Date(inv.issuedAtUtc).toLocaleDateString()}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Total Amount</span>
                                        <span>{formatNpr(inv.totalAmount)}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Discount</span>
                                        <span>{formatNpr(inv.discountAmount)}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Paid</span>
                                        <span>{formatNpr(inv.paidAmount)}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Pending Credit</span>
                                        <span>{formatNpr(inv.pendingCredit)}</span>
                                    </div>
                                    {inv.discountAmount > 0 &&
                                        inv.totalAmount + inv.discountAmount > 5000 && (
                                        <div className="loyalty-badge">10% Loyalty Discount Applied</div>
                                    )}
                                </div>
                            ))}
                            <PaginationControls
                                currentPage={invoicePage}
                                totalItems={history.invoices.length}
                                onPageChange={setInvoicePage}
                            />
                        </>
                    )}
                </div>
            )}

            {/* APPOINTMENTS */}
            {activeTab === "appointments" && (
                <div className="history-section">
                    {history.appointments.length === 0 ? (
                        <p className="history-empty">No appointments found.</p>
                    ) : (
                        <>
                            {paginate<Appointment>(history.appointments, appointmentPage).map((apt) => (
                                <div key={apt.id} className="history-card">
                                    <div className="history-card-row">
                                        <span className="history-card-label">Service</span>
                                        <span>{apt.serviceType}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Date</span>
                                        <span>{new Date(apt.appointmentDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="history-card-row">
                                        <span className="history-card-label">Status</span>
                                        <span className={`status-badge status-${apt.status.toLowerCase()}`}>{apt.status}</span>
                                    </div>
                                    {apt.notes && (
                                        <div className="history-card-row">
                                            <span className="history-card-label">Notes</span>
                                            <span>{apt.notes}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <PaginationControls
                                currentPage={appointmentPage}
                                totalItems={history.appointments.length}
                                onPageChange={setAppointmentPage}
                            />
                        </>
                    )}
                </div>
            )}

            {/* REVIEWS */}
            {activeTab === "reviews" && (
                <div className="history-section">
                    {history.serviceReviews.length === 0 ? (
                        <p className="history-empty">No reviews found.</p>
                    ) : (
                        <>
                            {paginate<Review>(history.serviceReviews, reviewPage).map((rev) => (
                                <div key={rev.id} className="history-card">
                                    <div className="history-card-row">
                                        <span className="history-card-label">Rating</span>
                                        <span>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                                    </div>
                                    {rev.comment && (
                                        <div className="history-card-row">
                                            <span className="history-card-label">Comment</span>
                                            <span>{rev.comment}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <PaginationControls
                                currentPage={reviewPage}
                                totalItems={history.serviceReviews.length}
                                onPageChange={setReviewPage}
                            />
                        </>
                    )}
                </div>
            )}

        </div>
    );
}

export default HistoryPage;