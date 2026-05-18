"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLoader, FiPlus, FiTrash2 } from "react-icons/fi";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import { formatNpr } from "@/lib/currency";
import "@/styles/pages/purchase-invoice.css";

type VendorOption = { id: string; name: string };
type PartOption = { id: string; name: string; partNumber: string; unitPrice: number };

type LineDraft = {
  rowId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseInvoiceRecord = {
  id: string;
  vendorId: string;
  issuedAtUtc: string;
  totalAmount: number;
  items: { partId: string; quantity: number; unitPrice: number }[];
};

const rowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readStr = (obj: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null) return String(v);
  }
  return "";
};

const readNum = (obj: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null) return Number(v);
  }
  return 0;
};

export default function AdminPurchaseInvoicesPage() {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [parts, setParts] = useState<PartOption[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoiceRecord[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ rowId: rowId(), partId: "", quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  const partById = useMemo(() => {
    const map = new Map<string, PartOption>();
    parts.forEach((p) => map.set(p.id, p));
    return map;
  }, [parts]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0),
    [lines],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [vendorRes, partRes, invoiceRes] = await Promise.all([
        apiFetch("/api/vendors"),
        apiFetch("/api/parts"),
        apiFetch("/api/purchase-invoices"),
      ]);

      const vendorData = await parseJsonSafe(vendorRes);
      const partData = await parseJsonSafe(partRes);
      const invoiceData = await parseJsonSafe(invoiceRes);

      if (vendorRes.ok && Array.isArray(vendorData)) {
        setVendors(
          vendorData.map((raw) => {
            const r = raw as Record<string, unknown>;
            return { id: readStr(r, "id", "Id"), name: readStr(r, "name", "Name") };
          }),
        );
      } else {
        setVendors([]);
      }

      if (partRes.ok && Array.isArray(partData)) {
        setParts(
          partData.map((raw) => {
            const r = raw as Record<string, unknown>;
            return {
              id: readStr(r, "id", "Id"),
              name: readStr(r, "name", "Name"),
              partNumber: readStr(r, "partNumber", "PartNumber"),
              unitPrice: readNum(r, "unitPrice", "UnitPrice"),
            };
          }),
        );
      } else {
        setParts([]);
      }

      if (invoiceRes.ok && Array.isArray(invoiceData)) {
        setInvoices(
          invoiceData.map((raw) => {
            const r = raw as Record<string, unknown>;
            const itemsRaw = (r.items ?? r.Items) as unknown;
            const items = Array.isArray(itemsRaw)
              ? itemsRaw.map((item) => {
                  const i = item as Record<string, unknown>;
                  return {
                    partId: readStr(i, "partId", "PartId"),
                    quantity: readNum(i, "quantity", "Quantity"),
                    unitPrice: readNum(i, "unitPrice", "UnitPrice"),
                  };
                })
              : [];
            return {
              id: readStr(r, "id", "Id"),
              vendorId: readStr(r, "vendorId", "VendorId"),
              issuedAtUtc: readStr(r, "issuedAtUtc", "IssuedAtUtc"),
              totalAmount: readNum(r, "totalAmount", "TotalAmount"),
              items,
            };
          }),
        );
      } else {
        setInvoices([]);
        if (!invoiceRes.ok) {
          setStatus({ tone: "error", text: extractApiError(invoiceData, "Could not load purchase invoices.") });
        }
      }
    } catch {
      setStatus({ tone: "error", text: "Network error while loading data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.rowId === id ? { ...line, ...patch } : line)));
  };

  const onPartChange = (id: string, partId: string) => {
    const part = partById.get(partId);
    updateLine(id, { partId, unitPrice: part?.unitPrice ?? 0 });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { rowId: rowId(), partId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.rowId !== id)));
  };

  const handleSubmit = async () => {
    setStatus(null);
    if (!vendorId) {
      setStatus({ tone: "error", text: "Select a vendor." });
      return;
    }

    const items = lines
      .filter((line) => line.partId && line.quantity > 0)
      .map((line) => ({
        partId: line.partId,
        quantity: Math.round(line.quantity),
        unitPrice: line.unitPrice,
      }));

    if (items.length === 0) {
      setStatus({ tone: "error", text: "Add at least one line with a part and quantity." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/purchase-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, items }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({ tone: "error", text: extractApiError(data, "Could not create purchase invoice.") });
        return;
      }

      setStatus({ tone: "success", text: "Purchase invoice recorded. Stock has been updated." });
      setVendorId("");
      setLines([{ rowId: rowId(), partId: "", quantity: 1, unitPrice: 0 }]);
      await loadAll();
    } catch {
      setStatus({ tone: "error", text: "Network error while saving." });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  };

  return (
    <main className="layout-main admin-page purchase-invoice-page">
      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Purchase invoices</h1>
          <p className="admin-page-subtitle">Record stock received from vendors. Total is the sum of line items (no tax or shipping).</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="form-button secondary" onClick={() => void loadAll()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {status && <div className={`purchase-invoice-status ${status.tone}`}>{status.text}</div>}

      <section className="form-card" style={{ maxWidth: "none" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>New purchase</h2>

        <label className="purchase-invoice-field">
          <span>Vendor</span>
          <select className="form-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <div className="purchase-invoice-lines">
          {lines.map((line) => (
            <div key={line.rowId} className="purchase-invoice-line-row">
              <select
                className="form-input"
                value={line.partId}
                onChange={(e) => onPartChange(line.rowId, e.target.value)}
                aria-label="Part"
              >
                <option value="">Select part</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.partNumber ? `(${p.partNumber})` : ""}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => updateLine(line.rowId, { quantity: Number(e.target.value) })}
                aria-label="Quantity"
                placeholder="Qty"
              />
              <input
                className="form-input"
                type="number"
                min={0}
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(line.rowId, { unitPrice: Number(e.target.value) })}
                aria-label="Unit price"
                placeholder="Unit price"
              />
              <button type="button" className="action-btn" onClick={() => removeLine(line.rowId)} aria-label="Remove line">
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>

        <div className="purchase-invoice-form-actions">
          <button type="button" className="form-button secondary" onClick={addLine}>
            <FiPlus aria-hidden /> Add line
          </button>
          <p className="purchase-invoice-subtotal">
            Subtotal: <strong>{formatNpr(subtotal)}</strong>
          </p>
          <button type="button" className="form-button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <FiLoader className="spin" aria-hidden /> : null}
            {submitting ? "Saving…" : "Save purchase"}
          </button>
        </div>
      </section>

      <section className="form-card inventory-container" style={{ maxWidth: "none", marginTop: "1.5rem", padding: 0, overflow: "hidden" }}>
        <h2 style={{ padding: "1rem 1rem 0", margin: 0, fontSize: "1.1rem" }}>Recent purchases</h2>
        <div className="inventory-table-scroll">
          <table className="inventory-table">
            <thead style={{ background: "#f9f6f0" }}>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Lines</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    Loading…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    No purchase invoices yet.
                  </td>
                </tr>
              ) : (
                invoices
                  .slice()
                  .sort((a, b) => new Date(b.issuedAtUtc).getTime() - new Date(a.issuedAtUtc).getTime())
                  .slice(0, 25)
                  .map((inv) => (
                    <tr key={inv.id}>
                      <td data-label="Date">{formatDate(inv.issuedAtUtc)}</td>
                      <td data-label="Vendor">{vendorNameById.get(inv.vendorId) ?? "—"}</td>
                      <td data-label="Lines">{inv.items.length}</td>
                      <td data-label="Total">{formatNpr(inv.totalAmount)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
