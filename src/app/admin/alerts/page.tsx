"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiCheckCircle,
  FiCreditCard,
  FiLoader,
  FiRefreshCw,
  FiSend,
} from "react-icons/fi";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

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
    }))
    .sort((a, b) => a.quantityInStock - b.quantityInStock);
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
    }))
    .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" });
};

const invoiceRef = (id: string) => (id ? id.slice(0, 8).toUpperCase() : "-");

const stockLevel = (qty: number) => {
  if (qty <= 0) return { label: "Out of stock", className: "critical" as const };
  if (qty <= 3) return { label: "Critical", className: "critical" as const };
  if (qty < 10) return { label: "Low", className: "low" as const };
  return { label: "OK", className: "ok" as const };
};

export default function AdminAlertsPage() {
  const [lowStock, setLowStock] = useState<LowStockPart[]>([]);
  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobResult, setJobResult] = useState<{
    tone: "success" | "error";
    title: string;
    lines: string[];
    smtpConfigured: boolean;
  } | null>(null);
  const [jobRunning, setJobRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [lowRes, odRes] = await Promise.all([
        apiFetch("/api/notifications/low-stock"),
        apiFetch("/api/notifications/overdue-credits"),
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
        setError("One or more alert lists could not be loaded. Check that the API is running.");
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

  const sendNotificationEmails = async () => {
    setJobRunning(true);
    setJobResult(null);
    try {
      const res = await apiFetch("/api/notifications/run-jobs?force=true", { method: "POST" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setJobResult({
          tone: "error",
          title: "Could not send emails",
          lines: [extractApiError(data, "Sending notification emails failed.")],
          smtpConfigured: false,
        });
        return;
      }

      const record = (typeof data === "object" && data ? data : {}) as Record<string, unknown>;
      const lowSent = Number(record.lowStockEmailsSent ?? record.LowStockEmailsSent ?? 0);
      const lowParts = Number(record.lowStockPartCount ?? record.LowStockPartCount ?? 0);
      const creditSent = Number(record.creditRemindersSent ?? record.CreditRemindersSent ?? 0);
      const smtpConfigured = Boolean(record.smtpConfigured ?? record.SmtpConfigured ?? true);
      const rawMessages = record.messages ?? record.Messages;
      const detailLines = Array.isArray(rawMessages)
        ? rawMessages.map((line) => String(line))
        : [];

      setJobResult({
        tone: "success",
        title: "Emails sent",
        smtpConfigured,
        lines: [
          `Low stock: ${lowParts} part(s) below threshold · ${lowSent} admin digest email(s) sent.`,
          `Overdue credit: ${creditSent} customer reminder email(s) sent.`,
          ...detailLines,
        ],
      });
      await load();
    } catch {
      setJobResult({
        tone: "error",
        title: "Connection failed",
        lines: ["Could not reach the server to send notification emails."],
        smtpConfigured: false,
      });
    } finally {
      setJobRunning(false);
    }
  };

  const totalOpenOverdue = useMemo(() => overdue.reduce((s, r) => s + r.pendingCredit, 0), [overdue]);
  const criticalStock = useMemo(() => lowStock.filter((p) => p.quantityInStock <= 3).length, [lowStock]);
  const hasAlerts = lowStock.length > 0 || overdue.length > 0;

  return (
    <section className="admin-alerts-page">
      <header className="admin-alerts-hero">
        <div className="admin-alerts-hero-text">
          <p className="admin-alerts-kicker">Admin · Notifications</p>
          <h1>Stock &amp; billing alerts</h1>
          <p className="admin-alerts-lead">
            Live view of inventory risk and overdue customer balances. Refresh to reload data; use Send now to
            email admins about low stock and customers about overdue payments.
          </p>
        </div>

        <div className="admin-alerts-hero-actions">
          <button
            type="button"
            className="admin-alerts-btn ghost"
            onClick={() => void load()}
            disabled={loading || jobRunning}
          >
            {loading ? <FiLoader className="admin-alerts-spin" aria-hidden /> : <FiRefreshCw aria-hidden />}
            Refresh
          </button>
          <button
            type="button"
            className="admin-alerts-btn primary"
            onClick={() => void sendNotificationEmails()}
            disabled={jobRunning}
            title="Send low-stock digests to admins and payment reminders to customers"
          >
            {jobRunning ? <FiLoader className="admin-alerts-spin" aria-hidden /> : <FiSend aria-hidden />}
            Send now
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-alerts-banner error" role="alert">
          <FiAlertTriangle aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {jobResult && (
        <div className={`admin-alerts-banner ${jobResult.tone}`} role="status">
          {jobResult.tone === "success" ? <FiCheckCircle aria-hidden /> : <FiAlertTriangle aria-hidden />}
          <div>
            <strong>{jobResult.title}</strong>
            <ul className="admin-alerts-banner-list">
              {jobResult.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {!jobResult.smtpConfigured && (
              <p className="admin-alerts-banner-note">
                SMTP is not configured in server settings - emails were not sent. Alerts on this page still work.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="admin-alerts-kpi-row">
        <article className={`admin-alerts-kpi ${lowStock.length ? "warn" : "ok"}`}>
          <span className="admin-alerts-kpi-icon" aria-hidden>
            <FiBox />
          </span>
          <div>
            <h3>Low stock</h3>
            <p className="admin-alerts-kpi-value">{loading ? "-" : lowStock.length}</p>
            <p className="admin-alerts-kpi-meta">
              {loading
                ? "Loading…"
                : lowStock.length
                  ? `${criticalStock} critical (≤3 units) · under 10 in stock`
                  : "All parts at or above 10 units"}
            </p>
          </div>
        </article>
        <article className={`admin-alerts-kpi ${overdue.length ? "warn" : "ok"}`}>
          <span className="admin-alerts-kpi-icon" aria-hidden>
            <FiCreditCard />
          </span>
          <div>
            <h3>Overdue credits</h3>
            <p className="admin-alerts-kpi-value">{loading ? "-" : overdue.length}</p>
            <p className="admin-alerts-kpi-meta">Unpaid balance · invoice older than 1 month</p>
          </div>
        </article>
        <article className={`admin-alerts-kpi ${totalOpenOverdue > 0 ? "warn" : ""}`}>
          <span className="admin-alerts-kpi-icon dark" aria-hidden>
            <FiCreditCard />
          </span>
          <div>
            <h3>Amount at risk</h3>
            <p className="admin-alerts-kpi-value">{loading ? "-" : formatNpr(totalOpenOverdue)}</p>
            <p className="admin-alerts-kpi-meta">Total pending in overdue list</p>
          </div>
        </article>
      </div>

      {!loading && !hasAlerts && !error && (
        <div className="admin-alerts-all-clear">
          <FiCheckCircle aria-hidden />
          <div>
            <strong>All clear</strong>
            <p>No low-stock parts and no overdue credit balances match the rules right now.</p>
          </div>
        </div>
      )}

      <div className="admin-alerts-two-col">
        <section className="admin-alerts-panel">
          <div className="admin-alerts-panel-head">
            <div>
              <h2>Low stock parts</h2>
              <p>Quantity below 10 · sorted lowest first</p>
            </div>
            <div className="admin-alerts-panel-head-right">
              <span className={`admin-alerts-pill ${lowStock.length ? "warn" : ""}`}>
                {lowStock.length} active
              </span>
              <Link href="/admin/parts" className="admin-alerts-panel-link">
                Manage inventory →
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="admin-alerts-empty">
              <FiLoader className="admin-alerts-spin" aria-hidden /> Loading parts…
            </p>
          ) : lowStock.length === 0 ? (
            <p className="admin-alerts-empty positive">
              <FiCheckCircle aria-hidden />
              Stock levels look healthy (≥10 units for all parts).
            </p>
          ) : (
            <div className="admin-alerts-table-wrap">
              <table className="admin-alerts-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>SKU</th>
                    <th>Status</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => {
                    const level = stockLevel(p.quantityInStock);
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name || "-"}</strong>
                        </td>
                        <td>
                          <code className="admin-alerts-sku">{p.partNumber || "-"}</code>
                        </td>
                        <td>
                          <span className={`admin-alerts-status-tag ${level.className}`}>{level.label}</span>
                        </td>
                        <td>
                          <span className={`admin-alerts-qty-badge ${level.className}`}>
                            {p.quantityInStock}
                          </span>
                        </td>
                        <td>{formatNpr(p.unitPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-alerts-panel">
          <div className="admin-alerts-panel-head">
            <div>
              <h2>Overdue credits</h2>
              <p>Customers with unpaid balance on old invoices</p>
            </div>
            <div className="admin-alerts-panel-head-right">
              <span className={`admin-alerts-pill ${overdue.length ? "warn" : ""}`}>{overdue.length} rows</span>
              <Link href="/staff/invoices" className="admin-alerts-panel-link">
                Sales invoices →
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="admin-alerts-empty">
              <FiLoader className="admin-alerts-spin" aria-hidden /> Loading credits…
            </p>
          ) : overdue.length === 0 ? (
            <p className="admin-alerts-empty positive">
              <FiCheckCircle aria-hidden />
              No overdue balances matched the rule.
            </p>
          ) : (
            <div className="admin-alerts-table-wrap">
              <table className="admin-alerts-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Due</th>
                    <th>Invoice</th>
                    <th>Age</th>
                    <th>Last reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((r) => (
                    <tr key={r.invoiceId}>
                      <td>
                        <strong>{r.customerName || "-"}</strong>
                        <span className="admin-alerts-sub">{r.customerEmail || "No email on file"}</span>
                      </td>
                      <td>
                        <strong className="admin-alerts-amount">{formatNpr(r.pendingCredit)}</strong>
                      </td>
                      <td>
                        <Link
                          href={`/staff/invoices?invoiceId=${r.invoiceId}`}
                          className="admin-alerts-invoice-link"
                        >
                          {invoiceRef(r.invoiceId)}
                        </Link>
                        <span className="admin-alerts-sub">Issued {formatDay(r.issuedAtUtc)}</span>
                      </td>
                      <td>
                        <span className={`admin-alerts-age-badge ${r.daysOutstanding > 60 ? "critical" : ""}`}>
                          {r.daysOutstanding} days
                        </span>
                      </td>
                      <td>{r.lastReminderSentUtc ? formatDay(r.lastReminderSentUtc) : "Never"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
