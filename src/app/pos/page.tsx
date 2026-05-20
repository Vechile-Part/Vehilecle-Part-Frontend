"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLoader, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import { formatNpr } from "@/lib/currency";
import { extractApiError, isUuid, parseJsonSafe, apiFetch } from "@/lib/http";
import { getShellRoleFromToken } from "@/lib/jwtRole";

type SalePart = {
  id: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  quantityInStock: number;
  isLowStock: boolean;
};

type CartLine = {
  rowId: string;
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CustomerOption = {
  id: string;
  label: string;
};

type CreatedInvoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
  items: { partName: string; quantity: number; lineTotal: number }[];
};

const LOYALTY_THRESHOLD = 5000;
const LOYALTY_RATE = 0.1;

const makeRowId = () => `cart-${Math.random().toString(36).slice(2, 9)}`;

const normalizePart = (record: Record<string, unknown>): SalePart | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  const qty = Number(record.quantityInStock ?? record.QuantityInStock ?? 0);
  return {
    id,
    name: String(record.name ?? record.Name ?? "Part"),
    partNumber: String(record.partNumber ?? record.PartNumber ?? ""),
    unitPrice: Number(record.unitPrice ?? record.UnitPrice ?? 0),
    quantityInStock: qty,
    isLowStock: Boolean(record.isLowStock ?? record.IsLowStock ?? qty < 10),
  };
};

const normalizeCustomerHit = (record: Record<string, unknown>): CustomerOption | null => {
  const id = String(record.id ?? record.Id ?? record.customerId ?? "");
  if (!id) return null;
  const name = String(record.fullName ?? record.FullName ?? record.name ?? "Customer");
  const phone = String(record.phone ?? record.Phone ?? "");
  return { id, label: phone ? `${name} · ${phone}` : name };
};

function stockBadge(part: SalePart) {
  if (part.quantityInStock <= 0) return { label: "Out", className: "out" };
  if (part.isLowStock || part.quantityInStock < 10) return { label: "Low", className: "low" };
  return { label: "OK", className: "ok" };
}

export default function SalesPosPage() {
  const [parts, setParts] = useState<SalePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partsFilter, setPartsFilter] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const loadParts = useCallback(async () => {
    setPartsLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const role = token ? getShellRoleFromToken(token) : null;
      const url = role === "admin" ? "/api/admin/parts" : "/api/staff/parts";
      const res = await apiFetch(url);
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setParts(
          data
            .map((item) => normalizePart(item as Record<string, unknown>))
            .filter((part): part is SalePart => part !== null),
        );
      } else {
        setParts([]);
        setStatus({ tone: "error", text: "Could not load parts for the sales counter." });
      }
    } catch {
      setParts([]);
      setStatus({ tone: "error", text: "Parts catalogue is unavailable right now." });
    } finally {
      setPartsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setPartsFilter(q);
  }, []);

  const filteredParts = useMemo(() => {
    const term = partsFilter.trim().toLowerCase();
    if (!term) return parts;
    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(term) ||
        part.partNumber.toLowerCase().includes(term),
    );
  }, [parts, partsFilter]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const loyaltyDiscount = useMemo(
    () => (subtotal > LOYALTY_THRESHOLD ? Math.round(subtotal * LOYALTY_RATE * 100) / 100 : 0),
    [subtotal],
  );
  const appliedDiscountPreview = Math.min(subtotal, Math.max(discountAmount, loyaltyDiscount));
  const estimatedTotal = Math.max(0, subtotal - appliedDiscountPreview);
  const balanceDue = Math.max(0, estimatedTotal - paidAmount);
  const changeDue = Math.max(0, paidAmount - estimatedTotal);
  const cartCount = cart.reduce((n, line) => n + line.quantity, 0);

  const addToCart = (part: SalePart) => {
    if (part.quantityInStock <= 0) {
      setStatus({ tone: "error", text: `${part.name} is out of stock.` });
      return;
    }

    setCart((current) => {
      const existing = current.find((line) => line.partId === part.id);
      if (existing) {
        if (existing.quantity >= part.quantityInStock) {
          setStatus({ tone: "error", text: `Only ${part.quantityInStock} units available for ${part.name}.` });
          return current;
        }
        return current.map((line) =>
          line.partId === part.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          rowId: makeRowId(),
          partId: part.id,
          name: part.name,
          quantity: 1,
          unitPrice: part.unitPrice,
        },
      ];
    });
    setStatus(null);
  };

  const updateLineQuantity = (rowId: string, quantity: number) => {
    const line = cart.find((item) => item.rowId === rowId);
    const part = parts.find((item) => item.id === line?.partId);
    const safeQty = Math.max(1, quantity);
    if (part && safeQty > part.quantityInStock) {
      setStatus({ tone: "error", text: `Only ${part.quantityInStock} units available for ${part.name}.` });
      return;
    }
    setCart((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, quantity: safeQty } : row)),
    );
  };

  const removeLine = (rowId: string) => {
    setCart((current) => current.filter((line) => line.rowId !== rowId));
  };

  const searchCustomers = async () => {
    const query = customerQuery.trim();
    if (!query) return;

    setIsSearchingCustomer(true);
    setStatus(null);
    try {
      const params = new URLSearchParams({
        fullName: "",
        phone: "",
        vehicleNumber: "",
      });

      if (isUuid(query)) {
        params.set("customerId", query);
      } else {
        params.set("fullName", query);
        if (/\d/.test(query)) {
          params.set("phone", query);
          params.set("vehicleNumber", query);
        }
      }

      const res = await apiFetch(`/api/staff/customers/search?${params.toString()}`);
      const data = await parseJsonSafe(res);
      if (!res.ok || !Array.isArray(data)) {
        setCustomerOptions([]);
        setStatus({ tone: "error", text: "Customer search failed." });
        return;
      }

      const options = data
        .map((item) => normalizeCustomerHit(item as Record<string, unknown>))
        .filter((item): item is CustomerOption => item !== null);

      setCustomerOptions(options);
      if (options.length === 1) setCustomerId(options[0].id);
      if (options.length === 0) setStatus({ tone: "error", text: "No customers matched that search." });
    } catch {
      setStatus({ tone: "error", text: "Customer search could not reach the server." });
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const submitSale = async () => {
    if (!isUuid(customerId)) {
      setStatus({ tone: "error", text: "Select or search for a valid customer before completing the sale." });
      return;
    }
    if (cart.length === 0) {
      setStatus({ tone: "error", text: "Add at least one part to the cart." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    setCreatedInvoice(null);

    try {
      const res = await apiFetch("/api/staff/sales-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          paidAmount: Number(paidAmount),
          discountAmount: Number(discountAmount),
          items: cart.map((line) => ({ partId: line.partId, quantity: line.quantity })),
        }),
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({
          tone: "error",
          text: extractApiError(data, "Sale could not be completed. Check stock and customer details."),
        });
        return;
      }

      const record = (typeof data === "object" && data ? data : {}) as Record<string, unknown>;
      const items = Array.isArray(record.items)
        ? record.items.map((item) => {
            const row = item as Record<string, unknown>;
            return {
              partName: String(row.partName ?? row.PartName ?? "Part"),
              quantity: Number(row.quantity ?? row.Quantity ?? 0),
              lineTotal: Number(row.lineTotal ?? row.LineTotal ?? 0),
            };
          })
        : [];

      const invoiceId = String(record.id ?? record.Id ?? "");
      const invoiceNumber = String(record.invoiceNumber ?? record.InvoiceNumber ?? "");
      const emailSent = Boolean(record.emailSent ?? record.EmailSent);
      const emailError = String(record.emailError ?? record.EmailError ?? "");

      setCreatedInvoice({
        id: invoiceId,
        invoiceNumber: invoiceNumber || invoiceId.slice(0, 8).toUpperCase(),
        customerId: String(record.customerId ?? record.CustomerId ?? customerId),
        totalAmount: Number(record.totalAmount ?? record.TotalAmount ?? 0),
        discountAmount: Number(record.discountAmount ?? record.DiscountAmount ?? 0),
        paidAmount: Number(record.paidAmount ?? record.PaidAmount ?? 0),
        pendingCredit: Number(record.pendingCredit ?? record.PendingCredit ?? 0),
        items,
      });

      let successText = "Sales invoice created and stock updated.";
      if (emailSent) {
        successText += " Invoice emailed to the customer.";
      } else if (emailError) {
        successText += ` Email was not sent: ${emailError}`;
      }
      setStatus({ tone: emailSent || !emailError ? "success" : "error", text: successText });
      setCart([]);
      setPaidAmount(0);
      setDiscountAmount(0);
      await loadParts();
    } catch {
      setStatus({ tone: "error", text: "Sale submission failed due to a network error." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!createdInvoice?.id) return;
    try {
      const res = await apiFetch(`/api/staff/sales-invoices/${createdInvoice.id}/send-email`, {
        method: "POST",
      });
      const data = await parseJsonSafe(res);
      setStatus(
        res.ok
          ? { tone: "success", text: "Invoice email sent to the customer." }
          : {
              tone: "error",
              text: extractApiError(data, "Email could not be sent for this invoice."),
            },
      );
    } catch {
      setStatus({ tone: "error", text: "Email request failed." });
    }
  };

  return (
    <section className="sales-pos-page layout-main">
      <header className="sales-pos-header">
        <div>
          <h1>Sales &amp; POS</h1>
          <p className="sales-pos-subtitle">
            Select parts, attach a customer, and complete payment. Loyalty: 10% off when subtotal exceeds{" "}
            {formatNpr(LOYALTY_THRESHOLD)}.
          </p>
        </div>
        <div className="sales-pos-header-totals" aria-live="polite">
          <div className="sales-pos-header-stat">
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </div>
          <div className="sales-pos-header-stat sales-pos-header-stat--due">
            <span>Total due</span>
            <strong>{formatNpr(estimatedTotal)}</strong>
          </div>
        </div>
      </header>

      {status ? <div className={`sales-pos-alert sales-pos-alert--${status.tone}`}>{status.text}</div> : null}

      <div className="sales-pos-layout">
        <div className="sales-pos-block">
          <div className="sales-pos-block-head">
            <h2>Parts catalogue</h2>
            <div className="sales-pos-toolbar">
              <input
                className="sales-pos-input"
                type="search"
                placeholder="Search name or part number…"
                value={partsFilter}
                onChange={(event) => setPartsFilter(event.target.value)}
                aria-label="Search parts"
              />
              <button
                type="button"
                className="sales-pos-btn sales-pos-btn--outline"
                onClick={() => void loadParts()}
                disabled={partsLoading}
              >
                {partsLoading ? <FiLoader size={16} className="sales-pos-spin" /> : "Refresh"}
              </button>
            </div>
          </div>

          <div className="sales-pos-table-wrap">
            <table className="sales-pos-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {partsLoading ? (
                  <tr>
                    <td colSpan={4} className="sales-pos-table-empty">
                      Loading parts…
                    </td>
                  </tr>
                ) : filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="sales-pos-table-empty">
                      No parts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredParts.map((part) => {
                    const badge = stockBadge(part);
                    const out = part.quantityInStock <= 0;
                    return (
                      <tr key={part.id} className={out ? "sales-pos-row--disabled" : undefined}>
                        <td>
                          <span className="sales-pos-part-name">{part.name}</span>
                          <span className="sales-pos-part-sku">{part.partNumber || "—"}</span>
                          <span className={`sales-pos-badge sales-pos-badge--${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td>{formatNpr(part.unitPrice)}</td>
                        <td>{part.quantityInStock}</td>
                        <td className="sales-pos-table-action">
                          <button
                            type="button"
                            className="sales-pos-btn sales-pos-btn--small"
                            onClick={() => addToCart(part)}
                            disabled={out}
                          >
                            <FiPlus size={14} aria-hidden /> Add
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="sales-pos-block sales-pos-block--checkout">
          <h2>Checkout</h2>

          <div className="sales-pos-section">
            <h3>Customer</h3>
            <label className="sales-pos-label">
              Search (name, phone, vehicle, or ID)
              <div className="sales-pos-input-row">
                <input
                  className="sales-pos-input"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Type to search…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchCustomers();
                    }
                  }}
                />
                <button
                  type="button"
                  className="sales-pos-btn sales-pos-btn--icon"
                  onClick={() => void searchCustomers()}
                  disabled={isSearchingCustomer}
                  aria-label="Search customers"
                >
                  {isSearchingCustomer ? <FiLoader size={18} className="sales-pos-spin" /> : <FiSearch size={18} />}
                </button>
              </div>
            </label>
            {customerOptions.length > 0 ? (
              <label className="sales-pos-label">
                Select customer
                <select
                  className="sales-pos-input"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Choose customer…</option>
                  {customerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="sales-pos-section">
            <h3>
              Cart <span className="sales-pos-muted">({cartCount} items)</span>
            </h3>
            {cart.length === 0 ? (
              <p className="sales-pos-hint">No items yet. Add parts from the catalogue.</p>
            ) : (
              <ul className="sales-pos-cart-list">
                {cart.map((line) => (
                  <li key={line.rowId} className="sales-pos-cart-item">
                    <div className="sales-pos-cart-item-info">
                      <strong>{line.name}</strong>
                      <span>{formatNpr(line.unitPrice)} each</span>
                    </div>
                    <input
                      className="sales-pos-input sales-pos-input--qty"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => updateLineQuantity(line.rowId, Number(event.target.value))}
                      aria-label={`Quantity for ${line.name}`}
                    />
                    <span className="sales-pos-cart-line-total">{formatNpr(line.unitPrice * line.quantity)}</span>
                    <button
                      type="button"
                      className="sales-pos-btn sales-pos-btn--icon sales-pos-btn--danger"
                      onClick={() => removeLine(line.rowId)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {loyaltyDiscount > 0 && discountAmount < loyaltyDiscount ? (
            <p className="sales-pos-loyalty">
              Loyalty discount available: {formatNpr(loyaltyDiscount)} (10% on subtotal over {formatNpr(LOYALTY_THRESHOLD)}).{" "}
              <button type="button" onClick={() => setDiscountAmount(loyaltyDiscount)}>
                Apply to discount
              </button>
            </p>
          ) : null}

          <div className="sales-pos-section">
            <h3>Payment</h3>
            <div className="sales-pos-field-row">
              <label className="sales-pos-label">
                Discount (NPR)
                <input
                  className="sales-pos-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(Number(event.target.value))}
                />
              </label>
              <label className="sales-pos-label">
                Paid (NPR)
                <input
                  className="sales-pos-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(Number(event.target.value))}
                />
              </label>
            </div>
            <button
              type="button"
              className="sales-pos-btn sales-pos-btn--outline sales-pos-btn--block"
              onClick={() => setPaidAmount(estimatedTotal)}
              disabled={cart.length === 0}
            >
              Pay full amount ({formatNpr(estimatedTotal)})
            </button>
          </div>

          <div className="sales-pos-summary">
            <div className="sales-pos-summary-row">
              <span>Subtotal</span>
              <span>{formatNpr(subtotal)}</span>
            </div>
            {appliedDiscountPreview > 0 ? (
              <div className="sales-pos-summary-row">
                <span>Discount</span>
                <span>−{formatNpr(appliedDiscountPreview)}</span>
              </div>
            ) : null}
            <div className="sales-pos-summary-row sales-pos-summary-row--total">
              <span>Total due</span>
              <strong>{formatNpr(estimatedTotal)}</strong>
            </div>
            {paidAmount > 0 ? (
              <>
                <div className="sales-pos-summary-row">
                  <span>Balance due</span>
                  <span>{formatNpr(balanceDue)}</span>
                </div>
                {changeDue > 0 ? (
                  <div className="sales-pos-summary-row">
                    <span>Change</span>
                    <span>{formatNpr(changeDue)}</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="sales-pos-checkout-actions">
            <button
              type="button"
              className="sales-pos-btn sales-pos-btn--primary sales-pos-btn--block"
              onClick={() => void submitSale()}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? "Processing…" : "Complete sale"}
            </button>
            <Link href="/staff/customers" className="sales-pos-btn sales-pos-btn--outline sales-pos-btn--block">
              Customer directory
            </Link>
          </div>

          {createdInvoice ? (
            <div className="sales-pos-receipt">
              <h3>Sale complete · {createdInvoice.invoiceNumber}</h3>
              <ul className="sales-pos-receipt-lines">
                <li>
                  <span>Total</span>
                  <strong>{formatNpr(createdInvoice.totalAmount)}</strong>
                </li>
                <li>
                  <span>Discount</span>
                  <strong>{formatNpr(createdInvoice.discountAmount)}</strong>
                </li>
                <li>
                  <span>Paid</span>
                  <strong>{formatNpr(createdInvoice.paidAmount)}</strong>
                </li>
                <li>
                  <span>Pending credit</span>
                  <strong>{formatNpr(createdInvoice.pendingCredit)}</strong>
                </li>
              </ul>
              {createdInvoice.items.length > 0 ? (
                <ul className="sales-pos-receipt-items">
                  {createdInvoice.items.map((item) => (
                    <li key={`${item.partName}-${item.quantity}`}>
                      {item.partName} × {item.quantity} — {formatNpr(item.lineTotal)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="sales-pos-receipt-actions">
                <button type="button" className="sales-pos-btn sales-pos-btn--outline" onClick={() => void sendInvoiceEmail()}>
                  Resend email
                </button>
                <Link
                  href={`/staff/invoices?invoiceId=${createdInvoice.id}`}
                  className="sales-pos-btn sales-pos-btn--outline"
                >
                  View invoice
                </Link>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
