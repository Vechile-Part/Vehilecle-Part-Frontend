"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

type LowStockPart = {
  id: string;
  name: string;
  partNumber: string;
  quantityInStock: number;
  unitPrice: number;
};

type OverdueRow = {
  invoiceId: string;
  customerName: string;
  customerEmail: string;
  pendingCredit: number;
  issuedAtUtc: string;
  lastReminderSentUtc: string | null;
  daysOutstanding: number;
};

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const parseJsonSafe = async (res: Response): Promise<unknown> => {
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

const readStr = (r: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
};

const readNum = (r: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const mapLowStock = (raw: unknown): LowStockPart[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((row) => ({
      id: readStr(row, "id", "Id"),
      name: readStr(row, "name", "Name"),
      partNumber: readStr(row, "partNumber", "PartNumber"),
      quantityInStock: readNum(row, "quantityInStock", "QuantityInStock"),
      unitPrice: readNum(row, "unitPrice", "UnitPrice"),
    }));
};

const mapOverdue = (raw: unknown): OverdueRow[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((row) => ({
      invoiceId: readStr(row, "invoiceId", "InvoiceId"),
      customerName: readStr(row, "customerName", "CustomerName"),
      customerEmail: readStr(row, "customerEmail", "CustomerEmail"),
      pendingCredit: readNum(row, "pendingCredit", "PendingCredit"),
      issuedAtUtc: readStr(row, "issuedAtUtc", "IssuedAtUtc"),
      lastReminderSentUtc: (() => {
        const v = row.lastReminderSentUtc ?? row.LastReminderSentUtc;
        if (v == null) return null;
        if (typeof v === "string") return v;
        return null;
      })(),
      daysOutstanding: readNum(row, "daysOutstanding", "DaysOutstanding"),
    }));
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function AdminAlertsPage() {
  const [lowStock, setLowStock] = useState<LowStockPart[]>([]);
  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [lowRes, odRes] = await Promise.all([
        fetch(`${API}/api/notifications/low-stock`, { headers: authHeaders() }),
        fetch(`${API}/api/notifications/overdue-credits`, { headers: authHeaders() }),
      ]);

      if (lowRes.status === 401 || lowRes.status === 403 || odRes.status === 401 || odRes.status === 403) {
        setLowStock([]);
        setOverdue([]);
        setError("You need to be signed in as an administrator to view stock and billing alerts.");
        return;
      }

      if (!lowRes.ok || !odRes.ok) {
        setLowStock([]);
        setOverdue([]);
        setError("One or more alert lists could not be loaded. Check that the API is running and you still have admin access.");
        return;
      }

      const lowBody = await parseJsonSafe(lowRes);
      const odBody = await parseJsonSafe(odRes);
      setLowStock(mapLowStock(lowBody));
      setOverdue(mapOverdue(odBody));
    } catch {
      setLowStock([]);
      setOverdue([]);
      setError("Network error while loading alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalOpenOverdue = useMemo(() => overdue.reduce((s, r) => s + r.pendingCredit, 0), [overdue]);

  return (
    <div className="financial-reports-page admin-alerts-page">
      <header className="financial-reports-hero">
        <div className="financial-reports-hero-text">
          <h1 className="financial-reports-title">Stock &amp; billing alerts</h1>
          <p className="financial-reports-subtitle">
            Live snapshot of parts running low and sales invoices where customers still owe money past the usual reminder window.
            This is the same data the background jobs use when they email admins and customers—only laid out so you can skim it
            without digging through the inbox.
          </p>
        </div>
        <button type="button" className="alerts-refresh-btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh lists"}
        </button>
      </header>

      {error && <div className="financial-reports-banner">{error}</div>}

      <section className="financial-reports-chart-card">
        <h2 className="financial-reports-card-title">How this ties together</h2>
        <p className="auth-register-lead" style={{ marginTop: 0, marginBottom: 0 }}>
          <strong>Low stock (&lt; 10 units):</strong> the server periodically checks inventory. When something dips under ten, it can email every admin address on file with a short digest (not every single click—there is a cooldown so your inbox does not catch fire).
        </p>
        <p className="auth-register-lead" style={{ marginTop: "12px", marginBottom: 0 }}>
          <strong>Overdue credits:</strong> if a sales invoice still has an open balance and the invoice date is more than a month ago, the system may send a polite payment reminder to the customer&apos;s email. Reminders are throttled so people are not nudged every day.
        </p>
        <ul className="alerts-bullet-list">
          <li>Numbers below refresh when you press &ldquo;Refresh lists&rdquo; or reload the page.</li>
          <li>To fix stock, use Parts &amp; inventory or purchase invoices; to chase a balance, open Sales &amp; POS or contact the customer directly.</li>
        </ul>
      </section>

      <div className="alerts-kpi-row">
        <article className="financial-reports-kpi">
          <h3>Parts below threshold</h3>
          <p className="financial-reports-kpi-value">{loading ? "—" : lowStock.length}</p>
          <p className={`financial-reports-kpi-trend ${lowStock.length ? "down" : "up"}`}>
            {lowStock.length ? "Reorder or receive stock soon" : "Nothing urgent right now"}
          </p>
        </article>
        <article className="financial-reports-kpi">
          <h3>Overdue credit rows</h3>
          <p className="financial-reports-kpi-value">{loading ? "—" : overdue.length}</p>
          <p className="financial-reports-muted" style={{ fontSize: "0.88rem", fontWeight: 600, marginTop: "4px" }}>
            Invoices older than one month with balance due
          </p>
        </article>
        <article className="financial-reports-kpi">
          <h3>Open balance (those rows)</h3>
          <p className="financial-reports-kpi-value">{loading ? "—" : money(totalOpenOverdue)}</p>
          <p className="financial-reports-muted" style={{ fontSize: "0.88rem", fontWeight: 600, marginTop: "4px" }}>
            Sum of pending credit in the table
          </p>
        </article>
      </div>

      <div className="alerts-two-col">
        <section className="financial-reports-table-card">
          <div className="financial-reports-table-head">
            <h2 className="financial-reports-card-title">Low stock parts</h2>
            <span className="financial-reports-date-pill">Threshold: fewer than 10 in stock</span>
          </div>
          <p className="financial-reports-card-hint">Same list that feeds the admin digest email. Sorted as returned from the server.</p>
          {loading ? (
            <p className="financial-reports-muted">Loading…</p>
          ) : lowStock.length === 0 ? (
            <p className="alerts-muted-block">No parts are under the threshold at the moment. When something slips, it will show up here.</p>
          ) : (
            <div className="financial-reports-table-wrap">
              <table className="financial-reports-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name || "—"}</td>
                      <td>{p.partNumber || "—"}</td>
                      <td>
                        <span className={`financial-reports-badge ${p.quantityInStock <= 3 ? "warn" : "neutral"}`}>
                          {p.quantityInStock}
                        </span>
                      </td>
                      <td>{money(p.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="financial-reports-table-card">
          <div className="financial-reports-table-head">
            <h2 className="financial-reports-card-title">Overdue credits</h2>
            <span className="financial-reports-date-pill">Invoice age &gt; 1 month, balance &gt; 0</span>
          </div>
          <p className="financial-reports-card-hint">
            These are the rows eligible for the automated customer reminder (subject to the cooldown between sends).
          </p>
          {loading ? (
            <p className="financial-reports-muted">Loading…</p>
          ) : overdue.length === 0 ? (
            <p className="alerts-muted-block">No overdue balances matched the rule. Either everyone is caught up, or sales data has not been entered yet.</p>
          ) : (
            <div className="financial-reports-table-wrap">
              <table className="financial-reports-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Outstanding</th>
                    <th>Invoice date</th>
                    <th>Days out</th>
                    <th>Last reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((r) => (
                    <tr key={r.invoiceId}>
                      <td>
                        <div>{r.customerName || "—"}</div>
                        <div className="financial-reports-muted" style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                          {r.customerEmail || "No email"}
                        </div>
                      </td>
                      <td>
                        <strong>{money(r.pendingCredit)}</strong>
                      </td>
                      <td>{formatDay(r.issuedAtUtc)}</td>
                      <td>
                        <span className={`financial-reports-badge ${r.daysOutstanding > 60 ? "warn" : "neutral"}`}>
                          {r.daysOutstanding}d
                        </span>
                      </td>
                      <td>{r.lastReminderSentUtc ? formatDay(r.lastReminderSentUtc) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="alerts-footnote">
        <strong>Note:</strong> sending mail still depends on SMTP settings on the server. This screen only reflects what is in the database;
        it does not prove an individual email left the building. For financial summaries, see{" "}
        <Link href="/reporting" style={{ color: "#624824", fontWeight: 700 }}>
          Financial reports
        </Link>
        .
      </p>
    </div>
  );
}
