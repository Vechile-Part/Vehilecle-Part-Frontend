"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleDashboard, { type DashboardAction, type DashboardKpi } from "@/Components/dashboard/RoleDashboard";
import { formatNpr } from "@/lib/currency";
import { formatNepalDateTime } from "@/lib/nepalTime";
import { apiFetch, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";

type AppointmentRow = {
  id: string;
  appointmentDate: string;
  serviceType: string;
  status: string;
};

type VehicleRow = {
  year: number;
  make: string;
  model: string;
  vehicleNumber: string;
};

type DashboardSummary = {
  fullName: string;
  vehicleCount: number;
  primaryVehicleLabel: string | null;
  upcomingCount: number;
  nextAppointment: AppointmentRow | null;
  purchaseCount: number;
  pendingCredit: number;
};

function parseAppointments(raw: unknown): AppointmentRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.Id ?? "");
      if (!id) return null;
      return {
        id,
        appointmentDate: String(row.appointmentDate ?? row.AppointmentDate ?? ""),
        serviceType: String(row.serviceType ?? row.ServiceType ?? "Service"),
        status: String(row.status ?? row.Status ?? ""),
      };
    })
    .filter((row): row is AppointmentRow => row !== null);
}

function parseVehicles(raw: unknown): VehicleRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        year: Number(row.year ?? row.Year ?? 0),
        make: String(row.make ?? row.Make ?? ""),
        model: String(row.model ?? row.Model ?? ""),
        vehicleNumber: String(row.vehicleNumber ?? row.VehicleNumber ?? ""),
      };
    })
    .filter((row): row is VehicleRow => row !== null);
}

function formatVehicleLabel(vehicle: VehicleRow) {
  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return vehicle.vehicleNumber ? `${label} · ${vehicle.vehicleNumber}` : label || "Vehicle";
}

function isUpcomingAppointment(appointment: AppointmentRow, now: number) {
  const status = appointment.status.trim().toLowerCase();
  if (status !== "pending" && status !== "confirmed") return false;
  const when = new Date(appointment.appointmentDate).getTime();
  return !Number.isNaN(when) && when >= now;
}

function buildSummary(
  profile: Record<string, unknown>,
  vehicles: VehicleRow[],
  appointments: AppointmentRow[],
  history: Record<string, unknown>,
): DashboardSummary {
  const now = Date.now();
  const upcoming = appointments
    .filter((a) => isUpcomingAppointment(a, now))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  const rawInvoices = Array.isArray(history.invoices) ? history.invoices : [];
  let pendingCredit = 0;
  for (const row of rawInvoices) {
    if (!row || typeof row !== "object") continue;
    const inv = row as Record<string, unknown>;
    pendingCredit += Math.max(0, Number(inv.pendingCredit ?? inv.PendingCredit ?? 0));
  }

  return {
    fullName: String(profile.fullName ?? profile.FullName ?? profile.name ?? "Customer"),
    vehicleCount: vehicles.length,
    primaryVehicleLabel: vehicles[0] ? formatVehicleLabel(vehicles[0]) : null,
    upcomingCount: upcoming.length,
    nextAppointment: upcoming[0] ?? null,
    purchaseCount: rawInvoices.length,
    pendingCredit,
  };
}

export default function CustomerDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
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

      const history =
        historyBody && typeof historyBody === "object" && !Array.isArray(historyBody)
          ? (historyBody as Record<string, unknown>)
          : {};

      setData(
        buildSummary(profile, parseVehicles(vehiclesBody), parseAppointments(appointmentsBody), history),
      );
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
        hint: data?.primaryVehicleLabel ?? undefined,
        href: "/customer/profile",
        hrefLabel: "Profile",
      },
      {
        label: "Upcoming visits",
        value: String(data?.upcomingCount ?? 0),
        hint: data?.nextAppointment
          ? `${data.nextAppointment.serviceType} — ${formatNepalDateTime(data.nextAppointment.appointmentDate)}`
          : undefined,
        href: "/customer/appointments",
        hrefLabel: "Appointments",
      },
      {
        label: "Purchases",
        value: String(data?.purchaseCount ?? 0),
        href: "/customer/history",
        hrefLabel: "History",
      },
      {
        label: "Balance due",
        value: formatNpr(data?.pendingCredit ?? 0),
        alert: (data?.pendingCredit ?? 0) > 0,
        href: "/customer/history",
        hrefLabel: "Invoices",
      },
    ],
    [data],
  );

  const actions: DashboardAction[] = [
    { href: "/customer/appointments", label: "Book appointment", primary: true },
    { href: "/customer/part-requests", label: "Request a part" },
    { href: "/customer/history", label: "History" },
    { href: "/customer/reviews", label: "Reviews" },
    { href: "/customer/profile", label: "Profile" },
    { href: "/customer/about", label: "About" },
  ];

  const greeting = data?.fullName ? (
    <p className="role-dashboard-greeting">Hello, {data.fullName.split(" ")[0] || data.fullName}</p>
  ) : null;

  return (
    <RoleDashboard
      title="My dashboard"
      subtitle="Your vehicles, visits, and purchases."
      kpis={kpis}
      actions={actions}
      loading={loading}
      error={error}
      greeting={!loading ? greeting : null}
    />
  );
}
