"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, authHeaders, extractApiError, parseJsonSafe } from "@/lib/http";
import { formatNepalDateTime } from "@/lib/nepalTime";

type AppointmentRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  appointmentDate: string;
  serviceType: string;
  status: string;
  notes: string;
  vehicleLabel: string;
};

type FilterKey = "all" | "pending" | "confirmed" | "upcoming";

const STATUS_OPTIONS = ["Pending", "Confirmed", "Completed", "NoShow", "Cancelled"] as const;

const normalizeRow = (raw: Record<string, unknown>): AppointmentRow | null => {
  const id = String(raw.id ?? raw.Id ?? "");
  if (!id) return null;
  const vehicleNumber = String(raw.vehicleNumber ?? raw.VehicleNumber ?? "");
  const make = String(raw.vehicleMake ?? raw.VehicleMake ?? "");
  const model = String(raw.vehicleModel ?? raw.VehicleModel ?? "");
  const year = Number(raw.vehicleYear ?? raw.VehicleYear ?? 0);
  const vehicleLabel =
    vehicleNumber || make
      ? [year ? String(year) : "", make, model, vehicleNumber ? `· ${vehicleNumber}` : ""]
          .filter(Boolean)
          .join(" ")
          .trim()
      : "";

  return {
    id,
    customerId: String(raw.customerId ?? raw.CustomerId ?? ""),
    customerName: String(raw.customerName ?? raw.CustomerName ?? "Customer"),
    customerPhone: String(raw.customerPhone ?? raw.CustomerPhone ?? ""),
    customerEmail: String(raw.customerEmail ?? raw.CustomerEmail ?? ""),
    appointmentDate: String(raw.appointmentDate ?? raw.AppointmentDate ?? ""),
    serviceType: String(raw.serviceType ?? raw.ServiceType ?? ""),
    status: String(raw.status ?? raw.Status ?? "Pending"),
    notes: String(raw.notes ?? raw.Notes ?? ""),
    vehicleLabel,
  };
};

const statusLabel = (status: string) => {
  if (status.toLowerCase() === "noshow") return "No show";
  return status;
};

const statusClass = (status: string) => status.replace(/\s+/g, "").toLowerCase();

const formatWhen = (iso: string) => formatNepalDateTime(iso);

export default function StaffAppointmentsPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/staff/appointments");
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setRows([]);
        const detail = extractApiError(body, "Could not load appointments.");
        if (res.status === 404) {
          setError(
            `${detail} The API may be outdated — stop and restart the backend (port 5020), then refresh this page.`,
          );
          return;
        }
        if (res.status === 401 || res.status === 403) {
          setError(`${detail} Sign in again as staff or admin.`);
          return;
        }
        setError(`${detail} (HTTP ${res.status})`);
        return;
      }
      const list = Array.isArray(body)
        ? body
            .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
            .map(normalizeRow)
            .filter((row): row is AppointmentRow => row !== null)
        : [];
      setRows(list);
      setDraftStatus(Object.fromEntries(list.map((row) => [row.id, row.status])));
    } catch {
      setRows([]);
      setError("Network error while loading appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((row) => {
      const when = new Date(row.appointmentDate).getTime();
      const status = row.status.toLowerCase();
      if (filter === "pending") return status === "pending";
      if (filter === "confirmed") return status === "confirmed";
      if (filter === "upcoming") {
        return (status === "pending" || status === "confirmed") && !Number.isNaN(when) && when >= now;
      }
      return true;
    });
  }, [rows, filter]);

  const saveStatus = async (row: AppointmentRow) => {
    const nextStatus = draftStatus[row.id] ?? row.status;
    if (nextStatus === row.status) return;

    setSavingId(row.id);
    setMessage("");
    setError("");
    try {
      const res = await apiFetch(`/api/staff/appointments/${row.id}/status`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setError(extractApiError(body, "Could not update status."));
        return;
      }
      setMessage(`Updated ${row.customerName} to ${statusLabel(nextStatus)}.`);
      await load();
    } catch {
      setError("Network error while updating appointment.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <main className="layout-main admin-page staff-appointments-page">
      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Appointments</h1>
          <p className="admin-page-subtitle">
            Confirm visits, mark completed services, or record no-shows. Only completed visits can be reviewed by
            customers.
          </p>
        </div>
      </header>

      {error ? (
        <p className="purchase-invoice-status error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="purchase-invoice-status success" role="status">
          {message}
        </p>
      ) : null}

      <div className="staff-appointments-filters" role="tablist" aria-label="Appointment filters">
        {(
          [
            ["upcoming", "Upcoming"],
            ["pending", "Pending"],
            ["confirmed", "Confirmed"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`staff-appointments-filter-btn${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="staff-appointments-table-wrap">
        {loading ? (
          <p className="staff-appointments-empty">Loading appointments…</p>
        ) : filtered.length === 0 ? (
          <p className="staff-appointments-empty">No appointments in this view.</p>
        ) : (
          <table className="staff-appointments-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Current</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.appointmentDate)}</td>
                  <td className="staff-appointments-customer">
                    <strong>{row.customerName}</strong>
                    <span>{row.customerPhone || row.customerEmail}</span>
                  </td>
                  <td>{row.vehicleLabel || "—"}</td>
                  <td>{row.serviceType}</td>
                  <td>
                    <span className={`staff-appointment-status-badge ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                      <select
                        className="staff-appointments-status-select"
                        value={draftStatus[row.id] ?? row.status}
                        onChange={(e) =>
                          setDraftStatus((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        aria-label={`Status for ${row.customerName}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="staff-appointments-save-btn"
                        disabled={savingId === row.id || (draftStatus[row.id] ?? row.status) === row.status}
                        onClick={() => void saveStatus(row)}
                      >
                        {savingId === row.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
