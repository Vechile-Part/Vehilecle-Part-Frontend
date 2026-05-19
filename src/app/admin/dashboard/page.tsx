"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import InteractiveDashboardCharts from "@/Components/InteractiveDashboardCharts";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

type Dashboard = {
  todaySales: number;
  todayInvoiceCount: number;
  lowStockPartCount: number;
  overdueCreditCount: number;
  totalPendingCredit: number;
  customerCount: number;
  activeStaffCount: number;
  pendingPartRequests: number;
};

type FinancialBucket = {
  label: string;
  grossRevenue: number;
  operatingCosts: number;
  netProfit: number;
};

type LowStockItem = {
  id: string;
  name: string;
  partNumber: string;
  quantityInStock: number;
};

type ChartPeriod = "daily" | "monthly";

const readDashboard = (raw: unknown): Dashboard | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    todaySales: Number(r.todaySales ?? r.TodaySales ?? 0),
    todayInvoiceCount: Number(r.todayInvoiceCount ?? r.TodayInvoiceCount ?? 0),
    lowStockPartCount: Number(r.lowStockPartCount ?? r.LowStockPartCount ?? 0),
    overdueCreditCount: Number(r.overdueCreditCount ?? r.OverdueCreditCount ?? 0),
    totalPendingCredit: Number(r.totalPendingCredit ?? r.TotalPendingCredit ?? 0),
    customerCount: Number(r.customerCount ?? r.CustomerCount ?? 0),
    activeStaffCount: Number(r.activeStaffCount ?? r.ActiveStaffCount ?? 0),
    pendingPartRequests: Number(r.pendingPartRequests ?? r.PendingPartRequests ?? 0),
  };
};

const mapBucket = (raw: unknown): FinancialBucket | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const label = String(r.label ?? r.Label ?? "");
  if (!label) return null;
  return {
    label,
    grossRevenue: Number(r.grossRevenue ?? r.GrossRevenue ?? 0),
    operatingCosts: Number(r.operatingCosts ?? r.OperatingCosts ?? 0),
    netProfit: Number(r.netProfit ?? r.NetProfit ?? 0),
  };
};

const mapBuckets = (raw: unknown): FinancialBucket[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapBucket).filter((b): b is FinancialBucket => b !== null);
};

const mapLowStock = (raw: unknown): LowStockItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? r.Id ?? "");
      if (!id) return null;
      return {
        id,
        name: String(r.name ?? r.Name ?? "Part"),
        partNumber: String(r.partNumber ?? r.PartNumber ?? ""),
        quantityInStock: Number(r.quantityInStock ?? r.QuantityInStock ?? 0),
      };
    })
    .filter((item): item is LowStockItem => item !== null);
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [chartBuckets, setChartBuckets] = useState<FinancialBucket[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalNetProfit: 0,
    previousPeriodNetProfit: 0,
    estimatedTax: 0,
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    const res = await apiFetch("/api/admin/dashboard");
    const body = await parseJsonSafe(res);
    if (!res.ok) {
      throw new Error(extractApiError(body, "Could not load dashboard."));
    }
    setData(readDashboard(body));
  }, []);

  const loadCharts = useCallback(async (period: ChartPeriod) => {
    setChartsLoading(true);
    try {
      const res = await apiFetch(`/api/admin/financial-dashboard/${period}`);
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setChartBuckets([]);
        return;
      }
      if (!body || typeof body !== "object") {
        setChartBuckets([]);
        return;
      }
      const record = body as Record<string, unknown>;
      setChartBuckets(mapBuckets(record.chartBuckets ?? record.ChartBuckets));
      setFinancialSummary({
        totalNetProfit: Number(record.totalNetProfit ?? record.TotalNetProfit ?? 0),
        previousPeriodNetProfit: Number(record.previousPeriodNetProfit ?? record.PreviousPeriodNetProfit ?? 0),
        estimatedTax: Number(record.estimatedTax ?? record.EstimatedTax ?? 0),
      });
    } catch {
      setChartBuckets([]);
    } finally {
      setChartsLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await apiFetch("/api/notifications/admin-summary");
    const body = await parseJsonSafe(res);
    if (!res.ok || !body || typeof body !== "object") {
      setLowStockItems([]);
      return;
    }
    const record = body as Record<string, unknown>;
    setLowStockItems(mapLowStock(record.lowStockItems ?? record.LowStockItems));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadDashboard(), loadAlerts()]);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [loadAlerts, loadDashboard]);

  const refresh = useCallback(() => {
    void loadAll();
    void loadCharts(chartPeriod);
  }, [chartPeriod, loadAll, loadCharts]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadCharts(chartPeriod);
  }, [chartPeriod, loadCharts]);

  const trendPct = useMemo(() => {
    const prev = financialSummary.previousPeriodNetProfit;
    const current = financialSummary.totalNetProfit;
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / Math.abs(prev)) * 100;
  }, [financialSummary]);

  const chartPeriodLabel = chartPeriod === "daily" ? "Last 7 days" : "This month";

  return (
    <main className="layout-main admin-dashboard-page">
      <header className="admin-dashboard-header">
        <div>
          <h1>Admin dashboard</h1>
          <p>Overview of sales, inventory alerts, and finances. Times use Nepal (NPT).</p>
        </div>
        <button
          type="button"
          className="admin-dashboard-refresh"
          disabled={loading}
          onClick={() => refresh()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? (
        <p className="admin-dashboard-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-dashboard-kpi-grid" aria-busy={loading}>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Today&apos;s sales</p>
          <p className="admin-dashboard-kpi-value">{loading ? "—" : formatNpr(data?.todaySales ?? 0)}</p>
          <p className="admin-dashboard-kpi-hint">{loading ? "" : `${data?.todayInvoiceCount ?? 0} invoice(s)`}</p>
        </article>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Customers</p>
          <p className="admin-dashboard-kpi-value">{loading ? "—" : String(data?.customerCount ?? 0)}</p>
          <Link href="/admin/customer-accounts" className="admin-dashboard-kpi-link">
            View accounts
          </Link>
        </article>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Active staff</p>
          <p className="admin-dashboard-kpi-value">{loading ? "—" : String(data?.activeStaffCount ?? 0)}</p>
          <Link href="/admin/staff" className="admin-dashboard-kpi-link">
            Manage staff
          </Link>
        </article>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Low stock</p>
          <p
            className={`admin-dashboard-kpi-value${(data?.lowStockPartCount ?? 0) > 0 ? " admin-dashboard-kpi-value--alert" : ""}`}
          >
            {loading ? "—" : String(data?.lowStockPartCount ?? 0)}
          </p>
          <Link href="/admin/alerts" className="admin-dashboard-kpi-link">
            View alerts
          </Link>
        </article>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Overdue credit</p>
          <p
            className={`admin-dashboard-kpi-value${(data?.overdueCreditCount ?? 0) > 0 ? " admin-dashboard-kpi-value--alert" : ""}`}
          >
            {loading ? "—" : String(data?.overdueCreditCount ?? 0)}
          </p>
          <p className="admin-dashboard-kpi-hint">
            {loading ? "" : `${formatNpr(data?.totalPendingCredit ?? 0)} outstanding`}
          </p>
        </article>
        <article className="admin-dashboard-kpi">
          <p className="admin-dashboard-kpi-label">Part requests</p>
          <p className="admin-dashboard-kpi-value">{loading ? "—" : String(data?.pendingPartRequests ?? 0)}</p>
          <Link href="/admin/part-requests" className="admin-dashboard-kpi-link">
            Open queue
          </Link>
        </article>
      </div>

      <div className="admin-dashboard-actions">
        <Link href="/pos" className="primary">
          Open POS
        </Link>
        <Link href="/admin/parts">Parts inventory</Link>
        <Link href="/admin/purchase-invoices">Purchase invoices</Link>
        <Link href="/reporting">Financial reports</Link>
        <Link href="/admin/alerts">Alerts</Link>
      </div>

      <section className="admin-dashboard-section" aria-labelledby="sales-charts-heading">
        <div className="admin-dashboard-section-head">
          <h2 id="sales-charts-heading">Sales &amp; expenses</h2>
          <div className="admin-dashboard-period-tabs" role="tablist" aria-label="Chart period">
            <button
              type="button"
              role="tab"
              aria-selected={chartPeriod === "daily"}
              className={chartPeriod === "daily" ? "active" : ""}
              onClick={() => setChartPeriod("daily")}
            >
              7 days
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartPeriod === "monthly"}
              className={chartPeriod === "monthly" ? "active" : ""}
              onClick={() => setChartPeriod("monthly")}
            >
              This month
            </button>
          </div>
        </div>
        {chartsLoading ? (
          <p className="admin-dashboard-charts-loading">Loading charts…</p>
        ) : (
          <InteractiveDashboardCharts data={chartBuckets} />
        )}
      </section>

      <div className="admin-dashboard-split">
        <article className="admin-dashboard-panel">
          <h3>Needs attention</h3>
          {loading ? (
            <p className="admin-dashboard-panel-empty">Loading…</p>
          ) : lowStockItems.length === 0 && (data?.overdueCreditCount ?? 0) === 0 && (data?.pendingPartRequests ?? 0) === 0 ? (
            <p className="admin-dashboard-panel-empty">No urgent items right now.</p>
          ) : (
            <ul>
              {(data?.overdueCreditCount ?? 0) > 0 && (
                <li>
                  <span>Overdue credit invoices</span>
                  <span>{data?.overdueCreditCount}</span>
                </li>
              )}
              {(data?.pendingPartRequests ?? 0) > 0 && (
                <li>
                  <span>Pending part requests</span>
                  <span>{data?.pendingPartRequests}</span>
                </li>
              )}
              {lowStockItems.slice(0, 6).map((part) => (
                <li key={part.id}>
                  <span>
                    {part.name}
                    {part.partNumber ? ` · ${part.partNumber}` : ""}
                  </span>
                  <span>Qty {part.quantityInStock}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/alerts" className="admin-dashboard-footer-link">
            Open alerts center →
          </Link>
        </article>

        <article className="admin-dashboard-panel">
          <h3>{chartPeriodLabel} summary</h3>
          <div className="admin-dashboard-stat-row">
            <span>Net profit</span>
            <strong>{chartsLoading ? "—" : formatNpr(financialSummary.totalNetProfit)}</strong>
          </div>
          <div className="admin-dashboard-stat-row">
            <span>vs previous period</span>
            <strong>
              {chartsLoading
                ? "—"
                : `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%`}
            </strong>
          </div>
          <div className="admin-dashboard-stat-row">
            <span>Estimated tax</span>
            <strong>{chartsLoading ? "—" : formatNpr(financialSummary.estimatedTax)}</strong>
          </div>
          <div className="admin-dashboard-stat-row">
            <span>Total pending credit</span>
            <strong>{loading ? "—" : formatNpr(data?.totalPendingCredit ?? 0)}</strong>
          </div>
          <Link href="/reporting" className="admin-dashboard-footer-link">
            Full financial reports →
          </Link>
        </article>
      </div>
    </main>
  );
}
