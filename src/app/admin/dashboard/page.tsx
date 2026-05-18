"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import InteractiveDashboardCharts from "@/Components/InteractiveDashboardCharts";

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

const readDashboard = (raw: unknown): Dashboard | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    todaySales: Number(r.todaySales ?? r.TodaySales ?? 0),
    todayInvoiceCount: Number(r.todayInvoiceCount ?? r.TodayInvoiceCount ?? 0),
    lowStockPartCount: Number(r.lowStockPartCount ?? r.LowStockPartCount ?? 0),
    overdueCreditCount: Number(r.overdueCreditCount ?? r.OverdueCreditCount ?? 0),
    totalPendingCredit: Number(r.totalPendingCredit ?? r.TotalPendingCredit ?? 0),
    customerCount: Number(r.customerCount ?? r.CustomerCount ?? r.memberCount ?? r.MemberCount ?? 0),
    activeStaffCount: Number(r.activeStaffCount ?? r.ActiveStaffCount ?? 0),
    pendingPartRequests: Number(r.pendingPartRequests ?? r.PendingPartRequests ?? 0),
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, chartRes] = await Promise.all([
        apiFetch("/api/admin/dashboard"),
        apiFetch("/api/admin/financial-dashboard/monthly")
      ]);
      const body = await parseJsonSafe(res);
      const chartBody = await parseJsonSafe(chartRes);

      if (!res.ok) {
        setData(null);
        setError(extractApiError(body, "Could not load dashboard."));
        return;
      }

      setData(readDashboard(body));

      if (chartRes.ok && chartBody && typeof chartBody === "object") {
        const rawBuckets = (chartBody as any).chartBuckets || (chartBody as any).ChartBuckets || [];
        setChartData(
          rawBuckets.map((b: any) => ({
            label: String(b.label ?? b.Label ?? ""),
            grossRevenue: Number(b.grossRevenue ?? b.GrossRevenue ?? 0),
            operatingCosts: Number(b.operatingCosts ?? b.OperatingCosts ?? 0),
            netProfit: Number(b.netProfit ?? b.NetProfit ?? 0),
          }))
        );
      }
    } catch {
      setData(null);
      setError("Network error while loading dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="layout-main admin-page">
      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Admin dashboard</h1>
          <p className="admin-page-subtitle">Warehouse overview for today and open items.</p>
        </div>
      </header>

      {error && (
        <p className="purchase-invoice-status error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-kpi-grid">
        <article className="summary-card">
          <div className="summary-card-label">Today&apos;s sales</div>
          <div className="summary-card-value">{loading ? "—" : formatNpr(data?.todaySales ?? 0)}</div>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6f5a45" }}>
            {loading ? "" : `${data?.todayInvoiceCount ?? 0} invoice(s)`}
          </p>
        </article>
        <article className="summary-card">
          <div className="summary-card-label">Low stock parts</div>
          <div
            className="summary-card-value"
            style={{ color: (data?.lowStockPartCount ?? 0) > 0 ? "#c63121" : undefined }}
          >
            {loading ? "—" : data?.lowStockPartCount ?? 0}
          </div>
          <Link href="/admin/alerts" style={{ fontSize: "13px", color: "#83512E" }}>
            View alerts
          </Link>
        </article>
        <article className="summary-card">
          <div className="summary-card-label">Overdue credit</div>
          <div className="summary-card-value">{loading ? "—" : data?.overdueCreditCount ?? 0}</div>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6f5a45" }}>
            {loading ? "" : formatNpr(data?.totalPendingCredit ?? 0)} open
          </p>
        </article>
        <article className="summary-card">
          <div className="summary-card-label">Active staff</div>
          <div className="summary-card-value">{loading ? "—" : data?.activeStaffCount ?? 0}</div>
          <Link href="/admin/staff" style={{ fontSize: "13px", color: "#83512E" }}>
            Manage staff
          </Link>
        </article>
        <article className="summary-card">
          <div className="summary-card-label">Customers</div>
          <div className="summary-card-value">{loading ? "—" : data?.customerCount ?? 0}</div>
          <Link href="/admin/customer-accounts" style={{ fontSize: "13px", color: "#83512E" }}>
            View all customers
          </Link>
        </article>
        <article className="summary-card">
          <div className="summary-card-label">Pending part requests</div>
          <div className="summary-card-value">{loading ? "—" : data?.pendingPartRequests ?? 0}</div>
          <Link href="/admin/part-requests" style={{ fontSize: "13px", color: "#83512E" }}>
            Review requests
          </Link>
        </article>
      </div>

      {!loading && chartData.length > 0 && (
        <InteractiveDashboardCharts data={chartData} />
      )}

      <div className="admin-quick-links">
        <Link href="/pos" className="financial-reports-btn primary">
          Open POS
        </Link>
        <Link href="/admin/parts" className="financial-reports-btn secondary">
          Parts inventory
        </Link>
        <Link href="/reporting" className="financial-reports-btn secondary">
          Financial reports
        </Link>
      </div>
    </main>
  );
}
