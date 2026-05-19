"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleDashboard, { type DashboardAction, type DashboardKpi } from "@/Components/dashboard/RoleDashboard";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

type StaffSummary = {
  regularCustomers: number;
  highSpenders: number;
  customersWithPendingCredits: number;
};

const readSummary = (raw: unknown): StaffSummary | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    regularCustomers: Number(r.regularCustomers ?? r.RegularCustomers ?? 0),
    highSpenders: Number(r.highSpenders ?? r.HighSpenders ?? 0),
    customersWithPendingCredits: Number(
      r.customersWithPendingCredits ?? r.CustomersWithPendingCredits ?? 0,
    ),
  };
};

export default function StaffDashboardPage() {
  const [data, setData] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/staff/customer-reports");
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setData(null);
        setError(extractApiError(body, "Could not load dashboard."));
        return;
      }
      setData(readSummary(body));
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

  const kpis: DashboardKpi[] = useMemo(
    () => [
      {
        label: "Regular customers",
        value: String(data?.regularCustomers ?? 0),
        hint: "3+ invoices",
        href: "/staff/reports",
        hrefLabel: "View report",
      },
      {
        label: "High spenders",
        value: String(data?.highSpenders ?? 0),
        href: "/staff/reports",
        hrefLabel: "View report",
      },
      {
        label: "Pending credit",
        value: String(data?.customersWithPendingCredits ?? 0),
        alert: (data?.customersWithPendingCredits ?? 0) > 0,
        href: "/staff/reports",
        hrefLabel: "View report",
      },
    ],
    [data],
  );

  const actions: DashboardAction[] = [
    { href: "/pos", label: "New sale", primary: true },
    { href: "/staff/customers", label: "Customers" },
    { href: "/staff/invoices", label: "Invoices" },
  ];

  return (
    <RoleDashboard
      title="Staff dashboard"
      subtitle="Customer overview for your workspace."
      kpis={kpis}
      actions={actions}
      loading={loading}
      error={error}
    />
  );
}
