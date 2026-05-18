"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

type PartRequestRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partName: string;
  description: string;
  status: string;
};

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Fulfilled"] as const;

const readStr = (r: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
};

const mapRow = (raw: unknown): PartRequestRow | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    id: readStr(r, "id", "Id"),
    customerId: readStr(r, "customerId", "CustomerId"),
    customerName: readStr(r, "customerName", "CustomerName"),
    customerEmail: readStr(r, "customerEmail", "CustomerEmail"),
    customerPhone: readStr(r, "customerPhone", "CustomerPhone"),
    partName: readStr(r, "partName", "PartName"),
    description: readStr(r, "description", "Description"),
    status: readStr(r, "status", "Status") || "Pending",
  };
};

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (s === "approved" || s === "fulfilled") return "up";
  if (s === "rejected") return "down";
  return "neutral";
};

export default function AdminPartRequestsPage() {
  const [rows, setRows] = useState<PartRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/part-requests");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(extractApiError(data, "Could not load part requests."));
        setRows([]);
        return;
      }
      if (!Array.isArray(data)) {
        setRows([]);
        return;
      }
      setRows(data.map(mapRow).filter((r): r is PartRequestRow => r !== null && r.id !== ""));
    } catch {
      setError("Could not load part requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "pending") {
      return rows.filter((r) => r.status.toLowerCase() === "pending");
    }
    return rows;
  }, [rows, filter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status.toLowerCase() === "pending").length,
    [rows],
  );

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    setMessage("");
    setError("");
    try {
      const res = await apiFetch(`/api/admin/part-requests/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(extractApiError(data, "Could not load part requests."));
        return;
      }
      setMessage(`Request marked as ${status}.`);
      await load();
    } catch {
      setError("Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="financial-reports-page admin-alerts-page">
      <header className="financial-reports-hero">
        <div className="financial-reports-hero-text">
          <h1 className="financial-reports-title">Customer part requests</h1>
          <p className="financial-reports-subtitle">
            When a customer cannot find a part in stock, they submit a request here. Review pending items and update status so staff know what to source.
          </p>
        </div>
        <div className="financial-reports-hero-actions">
          <button type="button" className="financial-reports-btn secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <Link href="/admin/parts" className="financial-reports-btn primary">
            Parts &amp; inventory
          </Link>
        </div>
      </header>

      {error && <div className="financial-reports-banner">{error}</div>}
      {message && <div className="financial-reports-banner alerts-job-status">{message}</div>}

      <div className="alerts-kpi-row">
        <article className="financial-reports-kpi">
          <h3>Total requests</h3>
          <p className="financial-reports-kpi-value">{loading ? "—" : rows.length}</p>
        </article>
        <article className="financial-reports-kpi">
          <h3>Pending review</h3>
          <p className="financial-reports-kpi-value">{loading ? "—" : pendingCount}</p>
          <p className={`financial-reports-kpi-trend ${pendingCount ? "down" : "up"}`}>
            {pendingCount ? "Needs admin attention" : "All caught up"}
          </p>
        </article>
      </div>

      <section className="financial-reports-table-card">
        <div className="financial-reports-table-head">
          <h2 className="financial-reports-card-title">Request queue</h2>
          <div className="financial-reports-hero-actions" style={{ margin: 0 }}>
            <button
              type="button"
              className={`financial-reports-btn ${filter === "all" ? "primary" : "secondary"}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`financial-reports-btn ${filter === "pending" ? "primary" : "secondary"}`}
              onClick={() => setFilter("pending")}
            >
              Pending only
            </button>
          </div>
        </div>

        {loading ? (
          <p className="financial-reports-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="alerts-muted-block">
            {filter === "pending"
              ? "No pending part requests right now."
              : "No part requests yet. Customers submit them from the portal under Part requests."}
          </p>
        ) : (
          <div className="financial-reports-table-wrap">
            <table className="financial-reports-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.partName}</strong>
                      {row.description ? (
                        <p className="financial-reports-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                          {row.description}
                        </p>
                      ) : null}
                    </td>
                    <td>{row.customerName || "—"}</td>
                    <td>
                      <div>{row.customerEmail || "—"}</div>
                      <div className="financial-reports-muted" style={{ fontSize: "0.85rem" }}>
                        {row.customerPhone || "—"}
                      </div>
                    </td>
                    <td>
                      <span className={`financial-reports-badge ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td>
                      <select
                        className="financial-reports-select"
                        value={row.status}
                        disabled={updatingId === row.id}
                        onChange={(e) => void updateStatus(row.id, e.target.value)}
                        aria-label={`Update status for ${row.partName}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
