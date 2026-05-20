"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MdNotificationsNone, MdPersonOutline, MdSearch } from "react-icons/md";
import { formatNpr } from "@/lib/currency";
import { formatNepalDateTime, formatNepalTimeOnly } from "@/lib/nepalTime";

export type StaffDashboardAppointmentRow = {
  id: string;
  customerName: string;
  vehicleNo: string;
  serviceType: string;
  appointmentDate: string;
  status: string;
  statusClass: string;
  statusLabel: string;
};

export type StaffDashboardSaleRow = {
  id: string;
  invoiceRef: string;
  customerName: string;
  amount: number;
  issuedAtUtc: string;
  statusLabel: string;
  statusClass: string;
};

export type StaffDashboardStats = {
  staffName: string;
  todaysAppointments: number;
  nextAppointmentText: string | null;
  pendingConfirmations: number;
  regularCustomers: number;
  pendingCredits: number;
  todaysSalesTotal: number;
  todaysInvoiceCount: number;
};

type StaffDashboardViewProps = {
  stats: StaffDashboardStats | null;
  todayAppointments: StaffDashboardAppointmentRow[];
  recentSales: StaffDashboardSaleRow[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function StaffDashboardView({
  stats,
  todayAppointments,
  recentSales,
  loading,
  error,
  onRetry,
}: StaffDashboardViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    const params = new URLSearchParams({ q: query });
    router.push(`/staff/customers?${params.toString()}`);
  };

  const greetingName = stats?.staffName ? firstName(stats.staffName) : null;

  return (
    <main className="layout-main staff-dashboard">
      <header className="staff-dashboard-top">
        <div className="staff-dashboard-titles">
          <h1>Staff Dashboard</h1>
          <p className="staff-dashboard-subtitle">Today&apos;s appointments and customer summary</p>
          {!loading && greetingName ? (
            <p className="staff-dashboard-greeting">Hello, {greetingName}</p>
          ) : null}
        </div>

        <div className="staff-dashboard-toolbar">
          <form className="staff-dashboard-search" onSubmit={submitSearch}>
            <MdSearch size={18} aria-hidden style={{ flexShrink: 0, color: "#8a7358" }} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, vehicle no, phone…"
              aria-label="Search customers"
            />
          </form>
          <Link
            href="/staff/appointments"
            className="staff-dashboard-icon-btn"
            aria-label="Appointments"
            title="Appointments"
          >
            <MdNotificationsNone size={20} />
          </Link>
          <Link
            href="/staff/profile"
            className="staff-dashboard-icon-btn"
            aria-label="Profile"
            title="Profile"
          >
            <MdPersonOutline size={20} />
          </Link>
        </div>
      </header>

      {error ? (
        <div className="staff-dashboard-error" role="alert">
          {error}{" "}
          <button type="button" className="staff-dashboard-link-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="staff-dashboard-cards" aria-label="Summary" aria-busy={loading}>
        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Today&apos;s appointments</p>
          <p className="staff-dashboard-card-value">{loading ? "—" : stats?.todaysAppointments ?? 0}</p>
          <p className="staff-dashboard-card-meta">
            {loading
              ? "Loading…"
              : stats?.nextAppointmentText ?? "No more appointments today"}
          </p>
        </article>

        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Pending confirmations</p>
          <p
            className={`staff-dashboard-card-value${!loading && (stats?.pendingConfirmations ?? 0) > 0 ? " staff-dashboard-card-value--alert" : ""}`}
          >
            {loading ? "—" : stats?.pendingConfirmations ?? 0}
          </p>
          <p className="staff-dashboard-card-meta">Appointments waiting approval</p>
        </article>

        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Regular customers</p>
          <p className="staff-dashboard-card-value">{loading ? "—" : stats?.regularCustomers ?? 0}</p>
          <p className="staff-dashboard-card-meta">Customers with 3+ purchases</p>
        </article>

        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Pending credits</p>
          <p
            className={`staff-dashboard-card-value${!loading && (stats?.pendingCredits ?? 0) > 0 ? " staff-dashboard-card-value--alert" : ""}`}
          >
            {loading ? "—" : stats?.pendingCredits ?? 0}
          </p>
          <p className="staff-dashboard-card-meta">Customers with unpaid credit</p>
        </article>

        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Today&apos;s sales</p>
          <p className="staff-dashboard-card-value">
            {loading ? "—" : formatNpr(stats?.todaysSalesTotal ?? 0)}
          </p>
          <p className="staff-dashboard-card-meta">Total sales amount today</p>
        </article>

        <article className="staff-dashboard-card">
          <p className="staff-dashboard-card-label">Invoice count</p>
          <p className="staff-dashboard-card-value">{loading ? "—" : stats?.todaysInvoiceCount ?? 0}</p>
          <p className="staff-dashboard-card-meta">Invoices created today</p>
        </article>
      </section>

      <section className="staff-dashboard-section" aria-labelledby="staff-today-appointments">
        <div className="staff-dashboard-section-head">
          <h2 id="staff-today-appointments">Today&apos;s appointments</h2>
          <Link href="/staff/appointments" className="staff-dashboard-link-btn">
            View all
          </Link>
        </div>
        {loading ? (
          <p className="staff-dashboard-loading">Loading appointments…</p>
        ) : todayAppointments.length === 0 ? (
          <p className="staff-dashboard-empty">No appointments scheduled for today.</p>
        ) : (
          <div className="staff-dashboard-table-wrap">
            <table className="staff-dashboard-table">
              <thead>
                <tr>
                  <th>Customer name</th>
                  <th>Vehicle no</th>
                  <th>Service type</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.customerName}</td>
                    <td>{row.vehicleNo || "—"}</td>
                    <td>{row.serviceType}</td>
                    <td>{formatNepalTimeOnly(row.appointmentDate)}</td>
                    <td>
                      <span className={`staff-dashboard-status staff-dashboard-status--${row.statusClass}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="staff-dashboard-section" aria-labelledby="staff-recent-sales">
        <div className="staff-dashboard-section-head">
          <h2 id="staff-recent-sales">Recent sales</h2>
          <Link href="/staff/invoices" className="staff-dashboard-link-btn">
            View all
          </Link>
        </div>
        {loading ? (
          <p className="staff-dashboard-loading">Loading sales…</p>
        ) : recentSales.length === 0 ? (
          <p className="staff-dashboard-empty">No sales invoices recorded yet.</p>
        ) : (
          <div className="staff-dashboard-table-wrap">
            <table className="staff-dashboard-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer name</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/staff/invoices?invoiceId=${row.id}`}>{row.invoiceRef}</Link>
                    </td>
                    <td>{row.customerName}</td>
                    <td>{formatNpr(row.amount)}</td>
                    <td>{formatNepalDateTime(row.issuedAtUtc)}</td>
                    <td>
                      <span className={`staff-dashboard-status staff-dashboard-status--${row.statusClass}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="staff-quick-actions">
        <div className="staff-dashboard-section-head" style={{ border: "none", background: "transparent", padding: "0 0 10px" }}>
          <h2 id="staff-quick-actions">Quick actions</h2>
        </div>
        <div className="staff-dashboard-actions">
          <Link href="/pos" className="staff-dashboard-action staff-dashboard-action--primary">
            New sale
          </Link>
          <Link href="/staff/register" className="staff-dashboard-action">
            Register customer
          </Link>
          <Link href="/staff/appointments" className="staff-dashboard-action">
            Appointments
          </Link>
          <Link href="/staff/customers" className="staff-dashboard-action">
            Customers
          </Link>
          <Link href="/staff/invoices" className="staff-dashboard-action">
            Invoices
          </Link>
          <Link href="/staff/reports" className="staff-dashboard-action">
            Reports
          </Link>
          <Link href="/staff/customers" className="staff-dashboard-action">
            Search customer
          </Link>
        </div>
      </section>
    </main>
  );
}
