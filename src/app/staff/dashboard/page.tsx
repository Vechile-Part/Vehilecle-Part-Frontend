"use client";

import { useCallback, useEffect, useState } from "react";
import StaffDashboardView, {
  type StaffDashboardAppointmentRow,
  type StaffDashboardSaleRow,
  type StaffDashboardStats,
} from "@/Components/dashboard/StaffDashboardView";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import { formatNepalTimeOnly, isNepalDateToday } from "@/lib/nepalTime";

const TABLE_ROW_LIMIT = 8;

function appointmentStatusDisplay(status: string): { label: string; className: string } {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") return { label: "Pending", className: "pending" };
  if (normalized === "confirmed") return { label: "Approved", className: "approved" };
  if (normalized === "completed") return { label: "Completed", className: "completed" };
  return { label: status, className: "pending" };
}

function invoiceStatusDisplay(pendingCredit: number): { label: string; className: string } {
  if (pendingCredit > 0) return { label: "Pending credit", className: "credit" };
  return { label: "Paid", className: "completed" };
}

function extractVehicleNo(raw: Record<string, unknown>, vehicleLabel: string): string {
  const direct = String(raw.vehicleNumber ?? raw.VehicleNumber ?? "").trim();
  if (direct) return direct;
  const match = vehicleLabel.match(/·\s*([^\s]+)\s*$/);
  return match?.[1]?.trim() ?? vehicleLabel;
}

function parseAppointments(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.Id ?? "");
      if (!id) return null;
      const vehicleNumber = String(row.vehicleNumber ?? row.VehicleNumber ?? "");
      const make = String(row.vehicleMake ?? row.VehicleMake ?? "");
      const model = String(row.vehicleModel ?? row.VehicleModel ?? "");
      const year = Number(row.vehicleYear ?? row.VehicleYear ?? 0);
      const vehicleLabel =
        vehicleNumber || make
          ? [year ? String(year) : "", make, model, vehicleNumber ? `· ${vehicleNumber}` : ""]
              .filter(Boolean)
              .join(" ")
              .trim()
          : "";
      const status = String(row.status ?? row.Status ?? "Pending");
      const appointmentDate = String(row.appointmentDate ?? row.AppointmentDate ?? "");
      const display = appointmentStatusDisplay(status);
      return {
        id,
        customerName: String(row.customerName ?? row.CustomerName ?? "Customer"),
        vehicleNo: extractVehicleNo(row, vehicleLabel),
        serviceType: String(row.serviceType ?? row.ServiceType ?? "Service"),
        appointmentDate,
        when: new Date(appointmentDate).getTime(),
        status,
        statusLabel: display.label,
        statusClass: display.className,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && !Number.isNaN(row.when));
}

function parseInvoices(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.Id ?? "");
      if (!id) return null;
      const invoiceNumber = String(row.invoiceNumber ?? row.InvoiceNumber ?? "");
      const pendingCredit = Number(row.pendingCredit ?? row.PendingCredit ?? 0);
      const issuedAtUtc = String(row.issuedAtUtc ?? row.IssuedAtUtc ?? "");
      const display = invoiceStatusDisplay(pendingCredit);
      return {
        id,
        invoiceRef: invoiceNumber || id.slice(0, 8).toUpperCase(),
        customerName: String(row.customerName ?? row.CustomerName ?? "Customer"),
        amount: Number(row.totalAmount ?? row.TotalAmount ?? 0),
        issuedAtUtc,
        when: new Date(issuedAtUtc).getTime(),
        pendingCredit,
        statusLabel: display.label,
        statusClass: display.className,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && !Number.isNaN(row.when));
}

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<StaffDashboardAppointmentRow[]>([]);
  const [recentSales, setRecentSales] = useState<StaffDashboardSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reportsRes, appointmentsRes, invoicesRes, profileRes] = await Promise.all([
        apiFetch("/api/staff/customer-reports"),
        apiFetch("/api/staff/appointments"),
        apiFetch("/api/staff/sales-invoices"),
        apiFetch("/api/staff/profile"),
      ]);

      const reportsBody = await parseJsonSafe(reportsRes);
      const appointmentsBody = await parseJsonSafe(appointmentsRes);
      const invoicesBody = await parseJsonSafe(invoicesRes);
      const profileBody = await parseJsonSafe(profileRes);

      if (!reportsRes.ok) {
        setStats(null);
        setTodayAppointments([]);
        setRecentSales([]);
        setError(extractApiError(reportsBody, "Could not load dashboard."));
        return;
      }

      const report =
        reportsBody && typeof reportsBody === "object" && !Array.isArray(reportsBody)
          ? (reportsBody as Record<string, unknown>)
          : {};

      const profile =
        profileRes.ok && profileBody && typeof profileBody === "object" && !Array.isArray(profileBody)
          ? (profileBody as Record<string, unknown>)
          : {};

      const appointments = parseAppointments(appointmentsBody);
      const invoices = parseInvoices(invoicesBody);

      const todayRows = appointments
        .filter((row) => isNepalDateToday(row.appointmentDate))
        .sort((a, b) => a.when - b.when);

      const pendingToday = todayRows.filter((row) => row.status.trim().toLowerCase() === "pending");

      const upcomingToday = todayRows.filter((row) => {
        const status = row.status.trim().toLowerCase();
        return status === "pending" || status === "confirmed";
      });

      const nextToday = upcomingToday[0] ?? todayRows[0];

      const todayInvoices = invoices.filter((row) => isNepalDateToday(row.issuedAtUtc));
      const todaysSalesTotal = todayInvoices.reduce((sum, row) => sum + row.amount, 0);

      const tableAppointments: StaffDashboardAppointmentRow[] = todayRows
        .slice(0, TABLE_ROW_LIMIT)
        .map(({ id, customerName, vehicleNo, serviceType, appointmentDate, statusLabel, statusClass }) => ({
          id,
          customerName,
          vehicleNo,
          serviceType,
          appointmentDate,
          status: "",
          statusLabel,
          statusClass,
        }));

      const tableSales: StaffDashboardSaleRow[] = [...invoices]
        .sort((a, b) => b.when - a.when)
        .slice(0, TABLE_ROW_LIMIT)
        .map(({ id, invoiceRef, customerName, amount, issuedAtUtc, statusLabel, statusClass }) => ({
          id,
          invoiceRef,
          customerName,
          amount,
          issuedAtUtc,
          statusLabel,
          statusClass,
        }));

      setStats({
        staffName: String(profile.fullName ?? profile.FullName ?? ""),
        todaysAppointments: todayRows.length,
        nextAppointmentText: nextToday
          ? `${nextToday.customerName} — ${formatNepalTimeOnly(nextToday.appointmentDate)}`
          : null,
        pendingConfirmations: pendingToday.length,
        regularCustomers: Number(report.regularCustomers ?? report.RegularCustomers ?? 0),
        pendingCredits: Number(
          report.customersWithPendingCredits ?? report.CustomersWithPendingCredits ?? 0,
        ),
        todaysSalesTotal,
        todaysInvoiceCount: todayInvoices.length,
      });
      setTodayAppointments(tableAppointments);
      setRecentSales(tableSales);
    } catch {
      setStats(null);
      setTodayAppointments([]);
      setRecentSales([]);
      setError("Network error while loading dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <StaffDashboardView
      stats={stats}
      todayAppointments={todayAppointments}
      recentSales={recentSales}
      loading={loading}
      error={error}
      onRetry={() => void load()}
    />
  );
}
