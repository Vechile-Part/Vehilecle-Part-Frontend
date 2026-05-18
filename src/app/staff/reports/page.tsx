"use client";

import { useCallback, useEffect, useState } from "react";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

type ReportRow = {
  customerId: string;
  fullName: string;
  phone: string;
  email: string;
  salesInvoiceCount: number;
  lifetimeSalesTotal: number;
  largestInvoiceTotal: number;
  totalOutstandingCredit: number;
};

type CustomerReport = {
  regularCustomers: number;
  highSpenders: number;
  customersWithPendingCredits: number;
  regularCustomerRows: ReportRow[];
  highSpenderRows: ReportRow[];
  pendingCreditRows: ReportRow[];
};

function normalizeRow(raw: Record<string, unknown>): ReportRow {
  return {
    customerId: String(raw.customerId ?? raw.CustomerId ?? ""),
    fullName: String(raw.fullName ?? raw.FullName ?? ""),
    phone: String(raw.phone ?? raw.Phone ?? ""),
    email: String(raw.email ?? raw.Email ?? ""),
    salesInvoiceCount: Number(raw.salesInvoiceCount ?? raw.SalesInvoiceCount ?? 0),
    lifetimeSalesTotal: Number(raw.lifetimeSalesTotal ?? raw.LifetimeSalesTotal ?? 0),
    largestInvoiceTotal: Number(raw.largestInvoiceTotal ?? raw.LargestInvoiceTotal ?? 0),
    totalOutstandingCredit: Number(raw.totalOutstandingCredit ?? raw.TotalOutstandingCredit ?? 0),
  };
}

function normalizeList(value: unknown): ReportRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeRow);
}

function ReportSection({ title, rows }: { title: string; rows: ReportRow[] }) {
  return (
    <section className="form-card" style={{ marginTop: "1rem" }}>
      <h2 className="form-section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="form-message">No records in this category.</p>
      ) : (
        <ReportRows rows={rows} />
      )}
    </section>
  );
}

function ReportRows({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="form-grid" style={{ gap: "0.75rem" }}>
      {rows.map((row) => (
        <article key={row.customerId} className="result-pre">
          <p>
            <strong>{row.fullName}</strong> — {row.phone}
          </p>
          <p>{row.email}</p>
          <p>
            Invoices: {row.salesInvoiceCount} · Lifetime: {formatNpr(row.lifetimeSalesTotal)} · Largest:{" "}
            {formatNpr(row.largestInvoiceTotal)} · Credit due: {formatNpr(row.totalOutstandingCredit)}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function StaffReportsPage() {
  const [report, setReport] = useState<CustomerReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/staff/customer-reports");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(extractApiError(data, "Could not load customer reports."));
        setReport(null);
        return;
      }
      if (!data || typeof data !== "object") {
        setError("Unexpected response from server.");
        setReport(null);
        return;
      }
      const record = data as Record<string, unknown>;
      setReport({
        regularCustomers: Number(record.regularCustomers ?? record.RegularCustomers ?? 0),
        highSpenders: Number(record.highSpenders ?? record.HighSpenders ?? 0),
        customersWithPendingCredits: Number(
          record.customersWithPendingCredits ?? record.CustomersWithPendingCredits ?? 0,
        ),
        regularCustomerRows: normalizeList(record.regularCustomerRows ?? record.RegularCustomerRows),
        highSpenderRows: normalizeList(record.highSpenderRows ?? record.HighSpenderRows),
        pendingCreditRows: normalizeList(record.pendingCreditRows ?? record.PendingCreditRows),
      });
    } catch {
      setError("Network error while loading reports.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className="form-page">
        <section className="form-card">
          <p className="form-message">Loading customer reports…</p>
        </section>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="form-page">
        <section className="form-card">
          <h1 className="form-title">Customer reports</h1>
          <p className="form-message">{error || "No data available."}</p>
          <button type="button" className="form-button" onClick={() => void load()}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Customer reports</h1>
        <p className="form-subtitle">
          Regular customers (3+ invoices): {report.regularCustomers} · High spenders (single purchase &gt;{" "}
          {formatNpr(5000)}): {report.highSpenders} · Pending credits: {report.customersWithPendingCredits}
        </p>
      </section>

      <ReportSection title="Regular customers" rows={report.regularCustomerRows} />
      <ReportSection title="High spenders" rows={report.highSpenderRows} />
      <ReportSection title="Pending credits" rows={report.pendingCreditRows} />
    </main>
  );
}
