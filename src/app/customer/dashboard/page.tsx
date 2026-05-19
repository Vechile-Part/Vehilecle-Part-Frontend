"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleDashboard, { type DashboardAction, type DashboardKpi } from "@/Components/dashboard/RoleDashboard";
import { apiFetch, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";

type CustomerSummary = {
  fullName: string;
  vehicleCount: number;
  upcomingAppointments: number;
  purchaseCount: number;
};

function countUpcomingAppointments(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  const now = Date.now();
  return raw.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    const dateRaw = row.appointmentDate ?? row.AppointmentDate;
    const status = String(row.status ?? row.Status ?? "").toLowerCase();
    if (status !== "pending" && status !== "confirmed") return false;
    const when = new Date(String(dateRaw));
    return !Number.isNaN(when.getTime()) && when.getTime() >= now;
  }).length;
}

export default function CustomerDashboardPage() {
  const [data, setData] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const customerId = readCustomerIdFromSession();
    if (!customerId) {
      setData(null);
      setError("Please sign in to view your dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [profileRes, vehiclesRes, appointmentsRes, historyRes] = await Promise.all([
        apiFetch(`/api/customers/${customerId}/profile`),
        apiFetch(`/api/customers/${customerId}/vehicles`),
        apiFetch(`/api/customers/${customerId}/appointments`),
        apiFetch(`/api/customer-history/${customerId}`),
      ]);

      const profileBody = await parseJsonSafe(profileRes);
      const vehiclesBody = await parseJsonSafe(vehiclesRes);
      const appointmentsBody = await parseJsonSafe(appointmentsRes);
      const historyBody = await parseJsonSafe(historyRes);

      if (!profileRes.ok) {
        setData(null);
        setError(extractApiError(profileBody, "Could not load dashboard."));
        return;
      }

      const profile =
        profileBody && typeof profileBody === "object" && !Array.isArray(profileBody)
          ? (profileBody as Record<string, unknown>)
          : {};

      const vehicles = Array.isArray(vehiclesBody) ? vehiclesBody : [];
      const history =
        historyBody && typeof historyBody === "object" && !Array.isArray(historyBody)
          ? (historyBody as Record<string, unknown>)
          : {};
      const invoices = Array.isArray(history.invoices) ? history.invoices : [];

      setData({
        fullName: String(profile.fullName ?? profile.name ?? "Customer"),
        vehicleCount: vehicles.length,
        upcomingAppointments: countUpcomingAppointments(appointmentsBody),
        purchaseCount: invoices.length,
      });
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
        label: "Vehicles",
        value: String(data?.vehicleCount ?? 0),
        href: "/customer/profile",
        hrefLabel: "Manage profile",
      },
      {
        label: "Upcoming visits",
        value: String(data?.upcomingAppointments ?? 0),
        href: "/customer/appointments",
        hrefLabel: "Book or view",
      },
      {
        label: "Purchases",
        value: String(data?.purchaseCount ?? 0),
        href: "/customer/history",
        hrefLabel: "View history",
      },
    ],
    [data],
  );

  const actions: DashboardAction[] = [
    { href: "/customer/appointments", label: "Book appointment", primary: true },
    { href: "/customer/about", label: "About service center" },
    { href: "/customer/part-requests", label: "Request a part" },
    { href: "/customer/profile", label: "My profile" },
  ];

  const greeting = data?.fullName ? (
    <p className="role-dashboard-greeting">Hello, {data.fullName.split(" ")[0] || data.fullName}</p>
  ) : null;

  return (
    <RoleDashboard
      title="My dashboard"
      subtitle="Your vehicles, visits, and purchases at a glance."
      kpis={kpis}
      actions={actions}
      loading={loading}
      error={error}
      greeting={!loading ? greeting : null}
    />
  );
}
