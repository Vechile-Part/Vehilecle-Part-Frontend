"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLoader, FiPlusCircle, FiSearch, FiShoppingCart, FiTrash2, FiUser } from "react-icons/fi";
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
  if (part.quantityInStock <= 0) return { label: "Out of stock", className: "out" };
  if (part.isLowStock || part.quantityInStock < 10) return { label: "Low stock", className: "low" };
  return { label: "In stock", className: "ok" };
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
      setStatus({ tone: "error", text: "Select or enter a valid customer before completing the sale." });
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
      setStatus({ tone: "success", text: "Sales invoice created and stock updated." });
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

  const cartCount = cart.reduce((n, line) => n + line.quantity, 0);

  return (
    <section className="sales-pos-page">
      <header className="sales-pos-header-band">
        <div className="sales-pos-header-main">
          <p className="sales-pos-kicker">Sales &amp; POS</p>
          <h1>Point of sale</h1>
          <p className="sales-pos-lead">
            Add parts, attach a customer, and complete the sale. Purchases over {formatNpr(LOYALTY_THRESHOLD)} qualify
            for loyalty discount.
          </p>
          <div className="sales-pos-steps" aria-label="Checkout steps">
            <span className="sales-pos-step">
              <span className="sales-pos-step-num">1</span> Catalogue
            </span>
            <span className="sales-pos-step">
              <span className="sales-pos-step-num">2</span> Customer
            </span>
            <span className="sales-pos-step">
              <span className="sales-pos-step-num">3</span> Pay
            </span>
          </div>
        </div>
        <div className="sales-pos-total-highlight" aria-live="polite">
          <span>Total due</span>
          <strong>{formatNpr(estimatedTotal)}</strong>
        </div>
      </header>

      <div className="sales-pos-stats">
        <span className="sales-pos-stat-pill">
          <FiShoppingCart aria-hidden /> Cart: <strong>{cartCount}</strong> item{cartCount === 1 ? "" : "s"}
        </span>
        <span className="sales-pos-stat-pill">
          Subtotal: <strong>{formatNpr(subtotal)}</strong>
        </span>
        <span className="sales-pos-stat-pill">
          Parts: <strong>{partsLoading ? "…" : parts.length}</strong>
        </span>
        {loyaltyDiscount > 0 && (
          <span className="sales-pos-stat-pill">
            Loyalty min.: <strong>{formatNpr(loyaltyDiscount)}</strong>
          </span>
        )}
      </div>

      {status && <div className={`sales-pos-status ${status.tone}`}>{status.text}</div>}

      <div className="sales-pos-grid">
        <div className="sales-pos-card">
          <div className="sales-pos-card-head">
            <p className="sales-pos-section-title">Inventory</p>
            <h2>Parts catalogue</h2>
          </div>
          <div className="sales-pos-card-body">
          <div className="sales-pos-parts-toolbar">
            <input
              className="sales-pos-search-input"
              placeholder="Search by name or part number…"
              value={partsFilter}
              onChange={(event) => setPartsFilter(event.target.value)}
            />
            <button
              type="button"
              className="sales-pos-btn-secondary-link"
              style={{ minWidth: 100 }}
              onClick={() => void loadParts()}
              disabled={partsLoading}
            >
              {partsLoading ? <FiLoader size={18} /> : "Refresh"}
            </button>
          </div>

          <div className="sales-pos-parts-list">
            {!partsLoading && filteredParts.length > 0 && (
              <div className="sales-pos-parts-list-head" aria-hidden>
                <span>Part</span>
                <span>Price</span>
                <span>Qty</span>
                <span />
              </div>
            )}
            {partsLoading ? (
              <p className="sales-pos-empty">Loading parts…</p>
            ) : filteredParts.length === 0 ? (
              <p className="sales-pos-empty">No parts match your search.</p>
            ) : (
              filteredParts.map((part) => {
                const badge = stockBadge(part);
                const out = part.quantityInStock <= 0;
                return (
                  <article
                    key={part.id}
                    className={`sales-pos-part-row ${part.isLowStock || part.quantityInStock < 10 ? "low-stock" : ""} ${out ? "out-of-stock" : ""}`}
                  >
                    <div className="sales-pos-part-meta">
                      <strong>{part.name}</strong>
                      <span className="sales-pos-part-sku">{part.partNumber || "No SKU"}</span>
                      <span className={`sales-pos-stock-badge ${badge.className}`}>{badge.label}</span>
                    </div>
                    <span className="sales-pos-part-price-col">{formatNpr(part.unitPrice)}</span>
                    <span className="sales-pos-part-qty-col">{part.quantityInStock}</span>
                    <button
                      type="button"
                      className="sales-pos-add-btn"
                      onClick={() => addToCart(part)}
                      disabled={out}
                    >
                      <FiPlusCircle size={16} aria-hidden /> Add
                    </button>
                  </article>
                );
              })
            )}
          </div>
          </div>
        </div>

        <div className="sales-pos-card sales-pos-card--checkout">
          <div className="sales-pos-card-head">
            <p className="sales-pos-section-title">Checkout</p>
            <h2>Customer &amp; payment</h2>
          </div>
          <div className="sales-pos-card-body">
          <div className="sales-pos-panel">
            <p className="sales-pos-panel-title">
              <FiUser size={14} aria-hidden /> Customer
            </p>
          <div className="sales-pos-customer-pick">
            <label className="sales-pos-field">
              <span>Search by name, phone, vehicle, or ID</span>
              <div className="sales-pos-search-row">
                <input
                  className="sales-pos-field-input"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Name, phone, vehicle, or ID"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void searchCustomers();
                    }
                  }}
                />
                <button
                  type="button"
                  className="sales-pos-search-btn"
                  onClick={() => void searchCustomers()}
                  disabled={isSearchingCustomer}
                  aria-label="Search customers"
                >
                  {isSearchingCustomer ? <FiLoader size={18} /> : <FiSearch size={18} />}
                </button>
              </div>
            </label>

            {customerOptions.length > 0 && (
              <label className="sales-pos-field">
                <span>Select from results</span>
                <select
                  className="sales-pos-field-input"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Select customer</option>
                  {customerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

          </div>
          </div>

          <div className="sales-pos-panel">
            <p className="sales-pos-panel-title">
              <FiShoppingCart size={14} aria-hidden /> Cart
            </p>
          <div className="sales-pos-cart-block">
            {cart.length === 0 ? (
              <p className="sales-pos-empty">No parts in the cart yet. Add items from the catalogue.</p>
            ) : (
              <>
                <div className="sales-pos-cart-head" aria-hidden>
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Line total</span>
                  <span />
                </div>
                <div className="sales-pos-cart-lines">
                  {cart.map((line) => (
                    <div key={line.rowId} className="sales-pos-cart-line">
                      <div className="sales-pos-cart-line-name">
                        <strong>{line.name}</strong>
                        <span>{formatNpr(line.unitPrice)} each</span>
                      </div>
                      <input
                        className="sales-pos-qty-input"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(event) => updateLineQuantity(line.rowId, Number(event.target.value))}
                        aria-label={`Quantity for ${line.name}`}
                      />
                      <div className="sales-pos-cart-line-total">{formatNpr(line.unitPrice * line.quantity)}</div>
                      <button
                        type="button"
                        className="sales-pos-icon-btn"
                        onClick={() => removeLine(line.rowId)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>

          {loyaltyDiscount > 0 && discountAmount < loyaltyDiscount && (
            <p className="sales-pos-loyalty-hint">
              Loyalty: subtotal over {formatNpr(LOYALTY_THRESHOLD)} — at least {formatNpr(loyaltyDiscount)} discount applies
              on complete sale.
              <button type="button" onClick={() => setDiscountAmount(loyaltyDiscount)}>
                Apply {formatNpr(loyaltyDiscount)} to discount field
              </button>
            </p>
          )}

          <div className="sales-pos-panel">
            <p className="sales-pos-panel-title">Payment</p>
          <div className="sales-pos-payment-grid">
            <label className="sales-pos-field">
              <span>Discount (NPR)</span>
              <input
                className="sales-pos-field-input"
                type="number"
                min={0}
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(Number(event.target.value))}
              />
            </label>
            <label className="sales-pos-field">
              <span>Paid amount (NPR)</span>
              <input
                className="sales-pos-field-input"
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
            className="sales-pos-btn-pay-full"
            onClick={() => setPaidAmount(estimatedTotal)}
            disabled={cart.length === 0}
          >
            Pay full amount ({formatNpr(estimatedTotal)})
          </button>
          </div>

          <div className="sales-pos-summary">
            <div className="sales-pos-summary-row">
              <span>Subtotal</span>
              <strong>{formatNpr(subtotal)}</strong>
            </div>
            {appliedDiscountPreview > 0 && (
              <div className="sales-pos-summary-row discount">
                <span>Discount (estimate)</span>
                <strong>−{formatNpr(appliedDiscountPreview)}</strong>
              </div>
            )}
            <div className="sales-pos-total-due-bar">
              <span>Total due</span>
              <strong>{formatNpr(estimatedTotal)}</strong>
            </div>
            {paidAmount > 0 && (
              <>
                <div className="sales-pos-summary-row">
                  <span>Balance due</span>
                  <strong>{formatNpr(balanceDue)}</strong>
                </div>
                {changeDue > 0 && (
                  <div className="sales-pos-summary-row">
                    <span>Change</span>
                    <strong>{formatNpr(changeDue)}</strong>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="sales-pos-actions">
            <button
              type="button"
              className="sales-pos-btn-primary"
              onClick={() => void submitSale()}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? "Processing…" : "Complete sale"}
            </button>
            <Link href="/staff/customers" className="sales-pos-btn-secondary-link">
              Customer directory
            </Link>
          </div>

          {createdInvoice && (
            <div className="sales-pos-receipt">
              <h3>Sale complete · {createdInvoice.invoiceNumber}</h3>
              <div className="sales-pos-summary">
                <div className="sales-pos-summary-row">
                  <span>Total</span>
                  <strong>{formatNpr(createdInvoice.totalAmount)}</strong>
                </div>
                <div className="sales-pos-summary-row">
                  <span>Discount applied</span>
                  <strong>{formatNpr(createdInvoice.discountAmount)}</strong>
                </div>
                <div className="sales-pos-summary-row">
                  <span>Paid</span>
                  <strong>{formatNpr(createdInvoice.paidAmount)}</strong>
                </div>
                <div className="sales-pos-summary-row">
                  <span>Pending credit</span>
                  <strong>{formatNpr(createdInvoice.pendingCredit)}</strong>
                </div>
              </div>
              {createdInvoice.items.length > 0 && (
                <ul className="sales-pos-receipt-list">
                  {createdInvoice.items.map((item) => (
                    <li key={`${item.partName}-${item.quantity}`}>
                      {item.partName} × {item.quantity} — {formatNpr(item.lineTotal)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="sales-pos-receipt-actions">
                <button
                  type="button"
                  className="sales-pos-btn-secondary-link"
                  onClick={() => void sendInvoiceEmail()}
                >
                  Email invoice
                </button>
                <Link
                  href={`/staff/invoices?invoiceId=${createdInvoice.id}`}
                  className="sales-pos-btn-secondary-link"
                >
                  View invoices
                </Link>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
