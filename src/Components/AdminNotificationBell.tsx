"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdNotifications, MdNotificationsNone } from "react-icons/md";
import { apiFetch, parseJsonSafe } from "@/lib/http";

type LowStockItem = {
  id: string;
  name: string;
  partNumber: string;
  quantityInStock: number;
};

type AdminNotificationSummary = {
  lowStockCount: number;
  overdueCreditCount: number;
  lowStockItems: LowStockItem[];
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

const mapSummary = (raw: unknown): AdminNotificationSummary | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const itemsRaw = r.lowStockItems ?? r.LowStockItems;
  const items: LowStockItem[] = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((row) => ({
          id: readStr(row, "id", "Id"),
          name: readStr(row, "name", "Name"),
          partNumber: readStr(row, "partNumber", "PartNumber"),
          quantityInStock: readNum(row, "quantityInStock", "QuantityInStock"),
        }))
        .filter((item) => item.id)
    : [];

  return {
    lowStockCount: readNum(r, "lowStockCount", "LowStockCount"),
    overdueCreditCount: readNum(r, "overdueCreditCount", "OverdueCreditCount"),
    lowStockItems: items,
  };
};

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AdminNotificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/notifications/admin-summary");
      const data = await parseJsonSafe(res);
      if (res.ok) {
        setSummary(mapSummary(data));
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const lowCount = summary?.lowStockCount ?? 0;
  const overdueCount = summary?.overdueCreditCount ?? 0;
  const badgeTotal = lowCount + overdueCount;
  const hasAlerts = badgeTotal > 0;

  return (
    <div className="sidebar-notify-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`sidebar-icon-btn sidebar-notify-btn ${hasAlerts ? "has-alerts" : ""}`}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        {hasAlerts ? <MdNotifications size={20} /> : <MdNotificationsNone size={20} />}
        {badgeTotal > 0 && (
          <span className="sidebar-notify-badge" aria-hidden>
            {badgeTotal > 99 ? "99+" : badgeTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="sidebar-notify-panel" role="dialog" aria-label="Admin notifications">
          <div className="sidebar-notify-panel-head">
            <strong>Notifications</strong>
            <button type="button" className="sidebar-notify-refresh" onClick={() => void load()} disabled={loading}>
              {loading ? "…" : "Refresh"}
            </button>
          </div>

          {lowCount > 0 ? (
            <section className="sidebar-notify-section">
              <p className="sidebar-notify-section-title">
                Low stock (&lt; 10) — {lowCount} part{lowCount === 1 ? "" : "s"}
              </p>
              <ul className="sidebar-notify-list">
                {(summary?.lowStockItems ?? []).slice(0, 6).map((part) => (
                  <li key={part.id}>
                    <span className="sidebar-notify-part-name">{part.name}</span>
                    <span className="sidebar-notify-part-qty">{part.quantityInStock} left</span>
                  </li>
                ))}
              </ul>
              {lowCount > 6 && (
                <p className="sidebar-notify-more">+ {lowCount - 6} more on alerts page</p>
              )}
            </section>
          ) : (
            <p className="sidebar-notify-empty">No low-stock parts right now.</p>
          )}

          {overdueCount > 0 && (
            <section className="sidebar-notify-section">
              <p className="sidebar-notify-section-title">
                Overdue credits — {overdueCount} invoice{overdueCount === 1 ? "" : "s"}
              </p>
              <p className="sidebar-notify-hint">Customers may receive payment reminder emails.</p>
            </section>
          )}

          <Link href="/admin/alerts" className="sidebar-notify-view-all" onClick={() => setOpen(false)}>
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
}
