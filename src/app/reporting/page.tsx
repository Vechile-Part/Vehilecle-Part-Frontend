"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

type Period = "daily" | "monthly" | "yearly";

type FinancialBucket = {
  label: string;
  dateUtc: string;
  grossRevenue: number;
  operatingCosts: number;
  netProfit: number;
  status: string;
};

type FinancialDashboard = {
  period: string;
  chartBuckets: FinancialBucket[];
  tableRows: FinancialBucket[];
  totalNetProfit: number;
  previousPeriodNetProfit: number;
  estimatedTax: number;
  pendingInvoiceCount: number;
  totalPendingCredits: number;
};

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const mapBucket = (raw: unknown): FinancialBucket | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    label: String(r.label ?? r.Label ?? ""),
    dateUtc: String(r.dateUtc ?? r.DateUtc ?? ""),
    grossRevenue: Number(r.grossRevenue ?? r.GrossRevenue ?? 0),
    operatingCosts: Number(r.operatingCosts ?? r.OperatingCosts ?? 0),
    netProfit: Number(r.netProfit ?? r.NetProfit ?? 0),
    status: String(r.status ?? r.Status ?? ""),
  };
};

const mapBuckets = (raw: unknown): FinancialBucket[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapBucket).filter((b): b is FinancialBucket => b !== null);
};

const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const formatRange = (rows: FinancialBucket[]) => {
  if (!rows.length) return "—";
  const first = new Date(rows[0].dateUtc);
  const last = new Date(rows[rows.length - 1].dateUtc);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${first.toLocaleDateString("en-US", opts)} – ${last.toLocaleDateString("en-US", opts)}`;
};

export default function ReportingPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [data, setData] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/financial-dashboard/${period}`, { headers: authHeaders() });
      const body = await parseJsonSafe(res);
      if (res.status === 401 || res.status === 403) {
        setData(null);
        setError("Administrator access required. Sign in with an admin account (staff login) to view financial reports.");
        return;
      }
      if (!res.ok) {
        setData(null);
        setError("Could not load financial data. Please try again.");
        return;
      }
      if (!body || typeof body !== "object") {
        setData(null);
        setError("Unexpected response from server.");
        return;
      }
      const d = body as Record<string, unknown>;
      setData({
        period: String(d.period ?? d.Period ?? period),
        chartBuckets: mapBuckets(d.chartBuckets ?? d.ChartBuckets),
        tableRows: mapBuckets(d.tableRows ?? d.TableRows),
        totalNetProfit: Number(d.totalNetProfit ?? d.TotalNetProfit ?? 0),
        previousPeriodNetProfit: Number(d.previousPeriodNetProfit ?? d.PreviousPeriodNetProfit ?? 0),
        estimatedTax: Number(d.estimatedTax ?? d.EstimatedTax ?? 0),
        pendingInvoiceCount: Number(d.pendingInvoiceCount ?? d.PendingInvoiceCount ?? 0),
        totalPendingCredits: Number(d.totalPendingCredits ?? d.TotalPendingCredits ?? 0),
      });
    } catch {
      setData(null);
      setError("Network error while loading reports.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartBuckets = data?.chartBuckets ?? [];
  const maxBar = useMemo(() => {
    let m = 1;
    for (const b of chartBuckets) {
      m = Math.max(m, b.grossRevenue, b.operatingCosts);
    }
    return m;
  }, [chartBuckets]);

  const trendPct = useMemo(() => {
    if (!data) return 0;
    const prev = data.previousPeriodNetProfit;
    if (prev === 0) return data.totalNetProfit > 0 ? 100 : 0;
    return ((data.totalNetProfit - prev) / Math.abs(prev)) * 100;
  }, [data]);

  return (
    <div className="financial-reports-page">
      <header className="financial-reports-hero">
        <div className="financial-reports-hero-text">
          <h1 className="financial-reports-title">Financial Reports</h1>
          <p className="financial-reports-subtitle">
            Detailed overview of revenue, expenses, and tax liabilities.
          </p>
        </div>
        <div className="financial-reports-segment" role="tablist" aria-label="Report period">
          {(["daily", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`financial-reports-segment-btn ${period === p ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p === "daily" ? "Daily" : p === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="financial-reports-banner">{error}</div>}

      <section className="financial-reports-grid-top">
        <div className="financial-reports-chart-card">
          <h2 className="financial-reports-card-title">Revenue vs Expenses</h2>
          <p className="financial-reports-card-hint">
            {period === "yearly" ? "Last seven months" : "Last seven days"} (UTC), sales vs purchase invoices.
          </p>
          {loading ? (
            <p className="financial-reports-muted">Loading chart…</p>
          ) : (
            <div className="financial-reports-bars" aria-hidden={chartBuckets.length === 0}>
              {chartBuckets.map((b) => {
                const hRev = b.grossRevenue <= 0 ? 0 : Math.max(8, Math.round((b.grossRevenue / maxBar) * 200));
                const hCost = b.operatingCosts <= 0 ? 0 : Math.max(8, Math.round((b.operatingCosts / maxBar) * 200));
                return (
                <div key={b.label + b.dateUtc} className="financial-reports-bar-group">
                  <div className="financial-reports-bar-pair">
                    <div
                      className="financial-reports-bar financial-reports-bar-revenue"
                      style={{ height: `${hRev}px` }}
                      title={`Revenue ${money(b.grossRevenue)}`}
                    />
                    <div
                      className="financial-reports-bar financial-reports-bar-expense"
                      style={{ height: `${hCost}px` }}
                      title={`Costs ${money(b.operatingCosts)}`}
                    />
                  </div>
                  <span className="financial-reports-bar-label">{b.label}</span>
                </div>
                );
              })}
            </div>
          )}
          <div className="financial-reports-legend">
            <span>
              <i className="financial-reports-dot revenue" /> Revenue
            </span>
            <span>
              <i className="financial-reports-dot expense" /> Expenses
            </span>
          </div>
        </div>

        <div className="financial-reports-kpi-column">
          <article className="financial-reports-kpi">
            <h3>Total Net Profit</h3>
            <p className="financial-reports-kpi-value">
              {loading ? "—" : money(data?.totalNetProfit ?? 0)}
            </p>
            <p className={`financial-reports-kpi-trend ${trendPct >= 0 ? "up" : "down"}`}>
              {loading
                ? "—"
                : `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}% from last period`}
            </p>
          </article>
          <article className="financial-reports-kpi">
            <h3>Estimated Tax (period)</h3>
            <p className="financial-reports-kpi-value">{loading ? "—" : money(data?.estimatedTax ?? 0)}</p>
            <button type="button" className="financial-reports-linkish" disabled>
              View tax breakdown
            </button>
          </article>
        </div>
      </section>

      <section className="financial-reports-table-card">
        <div className="financial-reports-table-head">
          <h2 className="financial-reports-card-title">
            {period === "yearly" ? "Monthly breakdown" : "Daily breakdown"}
          </h2>
          <span className="financial-reports-date-pill">{formatRange(data?.tableRows ?? [])}</span>
        </div>
        <div className="financial-reports-table-wrap">
          <table className="financial-reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Gross Revenue</th>
                <th>Operating Costs</th>
                <th>Net Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="financial-reports-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                (data?.tableRows ?? []).map((row) => (
                  <tr key={row.dateUtc}>
                    <td>{new Date(row.dateUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td>{money(row.grossRevenue)}</td>
                    <td>{money(row.operatingCosts)}</td>
                    <td>{money(row.netProfit)}</td>
                    <td>
                      <span className={`financial-reports-badge ${row.status === "Low Margin" ? "warn" : row.status === "Completed" ? "ok" : "neutral"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="financial-reports-linkish" disabled>
          Load previous {period === "yearly" ? "period" : "7 days"}
        </button>
      </section>

      <section className="financial-reports-insights">
        <article className="financial-reports-insight-card">
          <h3>Pending invoices</h3>
          <p className="financial-reports-insight-body">
            {loading
              ? "—"
              : `${data?.pendingInvoiceCount ?? 0} invoice${(data?.pendingInvoiceCount ?? 0) === 1 ? "" : "s"} with outstanding balance (${money(data?.totalPendingCredits ?? 0)}).`}
          </p>
          <span className="financial-reports-linkish-muted">Review pending</span>
        </article>
        <article className="financial-reports-insight-card">
          <h3>Cash flow forecast</h3>
          <p className="financial-reports-insight-body">Next 30 days projection can be derived from recent revenue trends and open credits.</p>
          <span className="financial-reports-linkish-muted">Generate forecast</span>
        </article>
      </section>
    </div>
  );
}
