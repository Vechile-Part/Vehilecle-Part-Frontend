"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FiRefreshCw, FiUsers } from "react-icons/fi";
import CustomerReportsCharts from "@/Components/reports/CustomerReportsCharts";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

const HIGH_SPENDER_MIN = 5000;

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

type ReportTab = "regular" | "high" | "credit";

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
    .map(normalizeRow)
    .filter((row) => row.customerId);
}

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const TAB_META: Record<
  ReportTab,
  { label: string; hint: string; countKey: keyof Pick<CustomerReport, "regularCustomers" | "highSpenders" | "customersWithPendingCredits">; rowsKey: keyof Pick<CustomerReport, "regularCustomerRows" | "highSpenderRows" | "pendingCreditRows"> }
> = {
  regular: {
    label: "Regular customers",
    hint: "Customers with 3 or more sales invoices.",
    countKey: "regularCustomers",
    rowsKey: "regularCustomerRows",
  },
  high: {
    label: "High spenders",
    hint: `Customers with at least one purchase over ${formatNpr(HIGH_SPENDER_MIN)}.`,
    countKey: "highSpenders",
    rowsKey: "highSpenderRows",
  },
  credit: {
    label: "Pending credits",
    hint: "Customers with outstanding credit on sales invoices.",
    countKey: "customersWithPendingCredits",
    rowsKey: "pendingCreditRows",
  },
};

function ReportTable({ rows, tab }: { rows: ReportRow[]; tab: ReportTab }) {
  if (rows.length === 0) {
    return (
      <p className="staff-reports-empty">
        {tab === "regular"
          ? "No regular customers yet. A customer needs 3+ invoices to appear here."
          : tab === "high"
            ? `No high spenders yet. Largest single purchase must exceed ${formatNpr(HIGH_SPENDER_MIN)}.`
            : "No customers with pending credit right now."}
      </p>
    );
  }

  return (
    <div className="financial-reports-table-wrap staff-reports-table-wrap">
      <table className="financial-reports-table staff-reports-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Invoices</th>
            <th>Lifetime sales</th>
            <th>Largest sale</th>
            <th>Credit due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.customerId}>
              <td>
                <div className="staff-reports-customer-cell">
                  <span className="staff-reports-avatar" aria-hidden>
                    {initialsFromName(row.fullName)}
                  </span>
                  <div>
                    <Link
                      href={`/staff/customers?customerId=${encodeURIComponent(row.customerId)}`}
                      className="staff-reports-customer-link"
                    >
                      {row.fullName || "Unnamed customer"}
                    </Link>
                  </div>
                </div>
              </td>
              <td>
                <div>{row.phone || "—"}</div>
                <div className="financial-reports-muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                  {row.email || "—"}
                </div>
              </td>
              <td>{row.salesInvoiceCount}</td>
              <td>{formatNpr(row.lifetimeSalesTotal)}</td>
              <td>{formatNpr(row.largestInvoiceTotal)}</td>
              <td>
                {row.totalOutstandingCredit > 0 ? (
                  <span className="financial-reports-badge warn">{formatNpr(row.totalOutstandingCredit)}</span>
                ) : (
                  <span className="financial-reports-badge ok">{formatNpr(0)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffReportsPage() {
  const [report, setReport] = useState<CustomerReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("regular");

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

  const activeRows = useMemo(() => {
    if (!report) return [];
    return report[TAB_META[tab].rowsKey] as ReportRow[];
  }, [report, tab]);

  const shell = (children: ReactNode) => (
    <div className="financial-reports-page staff-reports-page">{children}</div>
  );

  if (loading) {
    return shell(
      <section className="financial-reports-table-card">
        <p className="financial-reports-muted">Loading customer reports…</p>
      </section>,
    );
  }

  if (error || !report) {
    return shell(
      <>
        <header className="financial-reports-hero">
          <div className="financial-reports-hero-text">
            <h1 className="financial-reports-title">Customer reports</h1>
          </div>
        </header>
        <div className="financial-reports-banner">{error || "No data available."}</div>
        <button type="button" className="admin-alerts-btn primary" onClick={() => void load()}>
          Retry
        </button>
      </>,
    );
  }

  return shell(
    <>
      <header className="financial-reports-hero staff-reports-hero">
        <div className="financial-reports-hero-text">
          <h1 className="financial-reports-title">Customer reports</h1>
          <p className="financial-reports-subtitle">
            Regular customers, high spenders, and pending credit.
          </p>
        </div>
        <div className="admin-alerts-hero-actions">
          <button type="button" className="admin-alerts-btn ghost" onClick={() => void load()} disabled={loading}>
            <FiRefreshCw aria-hidden /> Refresh
          </button>
          <Link href="/staff/customers" className="admin-alerts-btn primary">
            <FiUsers aria-hidden /> Customer directory
          </Link>
        </div>
      </header>

      <div className="admin-alerts-kpi-row staff-reports-kpi-row">
        <article className="financial-reports-kpi staff-reports-kpi">
          <h3>Regular customers</h3>
          <p className="financial-reports-kpi-value">{report.regularCustomers}</p>
          <p className="financial-reports-kpi-trend up">3+ invoices</p>
        </article>
        <article className="financial-reports-kpi staff-reports-kpi">
          <h3>High spenders</h3>
          <p className="financial-reports-kpi-value">{report.highSpenders}</p>
          <p className="financial-reports-kpi-trend up">Over {formatNpr(HIGH_SPENDER_MIN)} once</p>
        </article>
        <article className="financial-reports-kpi staff-reports-kpi">
          <h3>Pending credits</h3>
          <p className="financial-reports-kpi-value">{report.customersWithPendingCredits}</p>
          <p className={`financial-reports-kpi-trend ${report.customersWithPendingCredits ? "down" : "up"}`}>
            {report.customersWithPendingCredits ? "Follow up on balances" : "All clear"}
          </p>
        </article>
      </div>

      <CustomerReportsCharts
        regularCount={report.regularCustomers}
        highCount={report.highSpenders}
        creditCount={report.customersWithPendingCredits}
        activeTab={tab}
        activeRows={activeRows}
      />

      <section className="financial-reports-table-card staff-reports-panel">
        <div className="financial-reports-table-head staff-reports-table-head">
          <div>
            <h2 className="financial-reports-card-title">{TAB_META[tab].label}</h2>
            <p className="financial-reports-card-hint" style={{ marginBottom: 0 }}>
              {TAB_META[tab].hint}
            </p>
          </div>
          <div className="financial-reports-segment" role="tablist" aria-label="Report category">
            {(Object.keys(TAB_META) as ReportTab[]).map((key) => {
              const meta = TAB_META[key];
              const count = report[meta.countKey];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`financial-reports-segment-btn ${tab === key ? "active" : ""}`}
                  onClick={() => setTab(key)}
                >
                  {meta.label}
                  <span className="staff-reports-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ReportTable rows={activeRows} tab={tab} />
      </section>
    </>,
  );
}
