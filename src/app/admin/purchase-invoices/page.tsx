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

type PurchaseItemRecord = {
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseInvoiceRecord = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorContactPerson: string;
  vendorPhone: string;
  vendorEmail: string;
  issuedAtUtc: string;
  totalAmount: number;
  items: PurchaseItemRecord[];
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
  const [recentPurchases, setRecentPurchases] = useState<PurchaseInvoiceRecord[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ rowId: rowId(), partId: "", quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const partById = useMemo(() => {
    const map = new Map<string, PartOption>();
    parts.forEach((p) => map.set(p.id, p));
    return map;
  }, [parts]);

  const vendorById = useMemo(() => {
    const map = new Map<string, VendorOption>();
    vendors.forEach((v) => map.set(v.id, v));
    return map;
  }, [vendors]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0),
    [lines],
  );

  const normalizePurchaseItem = (raw: Record<string, unknown>): PurchaseItemRecord => {
    const partId = readStr(raw, "partId", "PartId");
    const part = partById.get(partId);
    return {
      partId,
      partName: readStr(raw, "partName", "PartName") || part?.name || "Part",
      partNumber: readStr(raw, "partNumber", "PartNumber") || part?.partNumber || "",
      quantity: readNum(raw, "quantity", "Quantity"),
      unitPrice: readNum(raw, "unitPrice", "UnitPrice"),
    };
  };

  const normalizePurchase = (raw: Record<string, unknown>): PurchaseInvoiceRecord | null => {
    const id = readStr(raw, "id", "Id");
    if (!id) return null;

    const vendorId = readStr(raw, "vendorId", "VendorId");
    const vendor = vendorById.get(vendorId);
    const itemsRaw = raw.items ?? raw.Items;
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.map((item) => normalizePurchaseItem(item as Record<string, unknown>))
      : [];

    return {
      id,
      vendorId,
      vendorName: readStr(raw, "vendorName", "VendorName") || vendor?.name || "Vendor",
      vendorContactPerson: readStr(raw, "vendorContactPerson", "VendorContactPerson"),
      vendorPhone: readStr(raw, "vendorPhone", "VendorPhone"),
      vendorEmail: readStr(raw, "vendorEmail", "VendorEmail"),
      issuedAtUtc: readStr(raw, "issuedAtUtc", "IssuedAtUtc"),
      totalAmount: readNum(raw, "totalAmount", "TotalAmount"),
      items,
    };
  };

  const parsePurchases = (
    data: unknown,
    vendorMap: Map<string, VendorOption>,
    partMap: Map<string, PartOption>,
  ): PurchaseInvoiceRecord[] => {
    if (!Array.isArray(data)) return [];

    const normalizeWithMaps = (raw: Record<string, unknown>): PurchaseInvoiceRecord | null => {
      const id = readStr(raw, "id", "Id");
      if (!id) return null;

      const vid = readStr(raw, "vendorId", "VendorId");
      const vendor = vendorMap.get(vid);
      const itemsRaw = raw.items ?? raw.Items;
      const items = Array.isArray(itemsRaw)
        ? itemsRaw.map((item) => {
            const row = item as Record<string, unknown>;
            const partId = readStr(row, "partId", "PartId");
            const part = partMap.get(partId);
            return {
              partId,
              partName: readStr(row, "partName", "PartName") || part?.name || "Part",
              partNumber: readStr(row, "partNumber", "PartNumber") || part?.partNumber || "",
              quantity: readNum(row, "quantity", "Quantity"),
              unitPrice: readNum(row, "unitPrice", "UnitPrice"),
            };
          })
        : [];

      return {
        id,
        vendorId: vid,
        vendorName: readStr(raw, "vendorName", "VendorName") || vendor?.name || "Vendor",
        vendorContactPerson: readStr(raw, "vendorContactPerson", "VendorContactPerson"),
        vendorPhone: readStr(raw, "vendorPhone", "VendorPhone"),
        vendorEmail: readStr(raw, "vendorEmail", "VendorEmail"),
        issuedAtUtc: readStr(raw, "issuedAtUtc", "IssuedAtUtc"),
        totalAmount: readNum(raw, "totalAmount", "TotalAmount"),
        items,
      };
    };

    return data
      .map((row) => normalizeWithMaps(row as Record<string, unknown>))
      .filter((row): row is PurchaseInvoiceRecord => row !== null);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadingRecent(true);
    setStatus(null);
    try {
      const [vendorRes, partRes, purchaseRes] = await Promise.all([
        apiFetch("/api/vendors"),
        apiFetch("/api/parts"),
        apiFetch("/api/purchase-invoices"),
      ]);

      const [vendorData, partData, purchaseData] = await Promise.all([
        parseJsonSafe(vendorRes),
        parseJsonSafe(partRes),
        parseJsonSafe(purchaseRes),
      ]);

      const vendorList: VendorOption[] =
        vendorRes.ok && Array.isArray(vendorData)
          ? vendorData.map((raw) => {
              const r = raw as Record<string, unknown>;
              return { id: readStr(r, "id", "Id"), name: readStr(r, "name", "Name") };
            })
          : [];

      const partList: PartOption[] =
        partRes.ok && Array.isArray(partData)
          ? partData.map((raw) => {
              const r = raw as Record<string, unknown>;
              return {
                id: readStr(r, "id", "Id"),
                name: readStr(r, "name", "Name"),
                partNumber: readStr(r, "partNumber", "PartNumber"),
                unitPrice: readNum(r, "unitPrice", "UnitPrice"),
              };
            })
          : [];

      setVendors(vendorList);
      setParts(partList);

      const vendorMap = new Map(vendorList.map((v) => [v.id, v]));
      const partMap = new Map(partList.map((p) => [p.id, p]));
      setRecentPurchases(purchaseRes.ok ? parsePurchases(purchaseData, vendorMap, partMap) : []);
    } catch {
      setStatus({ tone: "error", text: "Network error while loading data." });
      setRecentPurchases([]);
    } finally {
      setLoading(false);
      setLoadingRecent(false);
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

  const sortedPurchases = useMemo(
    () =>
      recentPurchases
        .slice()
        .sort((a, b) => new Date(b.issuedAtUtc).getTime() - new Date(a.issuedAtUtc).getTime())
        .slice(0, 25),
    [recentPurchases],
  );

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
        <h2 style={{ padding: "1rem 1rem 0", margin: 0, fontSize: "1.1rem" }}>Recent vendor purchases</h2>
        <div className="inventory-table-scroll">
          <table className="inventory-table">
            <thead style={{ background: "#f9f6f0" }}>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Items purchased</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecent ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    Loading…
                  </td>
                </tr>
              ) : sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    No vendor purchases yet. Save a purchase above to see it here.
                  </td>
                </tr>
              ) : (
                sortedPurchases
                  .map((purchase) => (
                    <tr key={purchase.id}>
                      <td data-label="Date">{formatDate(purchase.issuedAtUtc)}</td>
                      <td data-label="Vendor">
                        <div style={{ fontWeight: 600 }}>{purchase.vendorName}</div>
                        {purchase.vendorContactPerson ? (
                          <div style={{ fontSize: "12px", color: "#6f5a45" }}>{purchase.vendorContactPerson}</div>
                        ) : null}
                        {purchase.vendorPhone ? (
                          <div style={{ fontSize: "12px", color: "#6f5a45" }}>{purchase.vendorPhone}</div>
                        ) : null}
                        {purchase.vendorEmail ? (
                          <div style={{ fontSize: "12px", color: "#6f5a45" }}>{purchase.vendorEmail}</div>
                        ) : null}
                      </td>
                      <td data-label="Items purchased">
                        {purchase.items.length === 0 ? (
                          <span style={{ color: "#6f5a45" }}>—</span>
                        ) : (
                          <ul className="purchase-invoice-history-items">
                            {purchase.items.map((item, index) => {
                              const lineTotal = item.quantity * item.unitPrice;
                              const label = item.partNumber
                                ? `${item.partName} (${item.partNumber})`
                                : item.partName;
                              return (
                                <li key={`${purchase.id}-${item.partId}-${index}`}>
                                  <span className="purchase-invoice-history-item-name">{label}</span>
                                  <span className="purchase-invoice-history-item-meta">
                                    {item.quantity} × {formatNpr(item.unitPrice)} = {formatNpr(lineTotal)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td data-label="Total">{formatNpr(purchase.totalAmount)}</td>
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
