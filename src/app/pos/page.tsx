"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLoader, FiPlusCircle, FiTrash2 } from "react-icons/fi";
import { API_BASE_URL } from "@/lib/api";
import { authHeaders, isUuid, parseJsonSafe } from "@/lib/http";
import { getShellRoleFromToken } from "@/lib/jwtRole";

const API = API_BASE_URL;

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
  customerId: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
  items: { partName: string; quantity: number; lineTotal: number }[];
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR" }).format(amount);

const makeRowId = () => `cart-${Math.random().toString(36).slice(2, 9)}`;

const normalizePart = (record: Record<string, unknown>): SalePart | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(record.name ?? record.Name ?? "Part"),
    partNumber: String(record.partNumber ?? record.PartNumber ?? ""),
    unitPrice: Number(record.unitPrice ?? record.UnitPrice ?? 0),
    quantityInStock: Number(record.quantityInStock ?? record.QuantityInStock ?? 0),
    isLowStock: Boolean(record.isLowStock ?? record.IsLowStock ?? false),
  };
};

const normalizeCustomerHit = (record: Record<string, unknown>): CustomerOption | null => {
  const id = String(record.id ?? record.Id ?? record.customerId ?? "");
  if (!id) return null;
  const name = String(record.fullName ?? record.FullName ?? record.name ?? "Customer");
  const phone = String(record.phone ?? record.Phone ?? "");
  return { id, label: phone ? `${name} · ${phone}` : name };
};

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
      const url =
        role === "admin" ? `${API}/api/admin/parts` : `${API}/api/staff/parts`;
      const res = await fetch(url, { headers: authHeaders() });
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
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

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
    const part = parts.find((item) => cart.find((line) => line.rowId === rowId)?.partId === item.id);
    const safeQty = Math.max(1, quantity);
    if (part && safeQty > part.quantityInStock) {
      setStatus({ tone: "error", text: `Only ${part.quantityInStock} units available for ${part.name}.` });
      return;
    }
    setCart((current) =>
      current.map((line) => (line.rowId === rowId ? { ...line, quantity: safeQty } : line)),
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

      const res = await fetch(`${API}/api/staff/customers/search?${params.toString()}`, {
        headers: authHeaders(),
      });
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
      setStatus({ tone: "error", text: "Select or enter a valid customer ID before completing the sale." });
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
      const res = await fetch(`${API}/api/staff/sales-invoices`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          customerId,
          paidAmount: Number(paidAmount),
          discountAmount: Number(discountAmount),
          items: cart.map((line) => ({ partId: line.partId, quantity: line.quantity })),
        }),
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        const message =
          typeof data === "object" && data && "title" in data
            ? String((data as { title?: string }).title)
            : typeof data === "string"
              ? data
              : "Sale could not be completed. Check stock and customer details.";
        setStatus({ tone: "error", text: message });
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

      setCreatedInvoice({
        id: String(record.id ?? record.Id ?? ""),
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
      const res = await fetch(`${API}/api/staff/sales-invoices/${createdInvoice.id}/send-email`, {
        method: "POST",
        headers: authHeaders(),
      });
      setStatus(
        res.ok
          ? { tone: "success", text: "Invoice email sent to the customer." }
          : { tone: "error", text: "Email could not be sent for this invoice." },
      );
    } catch {
      setStatus({ tone: "error", text: "Email request failed." });
    }
  };

  return (
    <section className="sales-pos-page">
      <header className="sales-pos-header">
        <p className="purchase-invoice-kicker">Sales &amp; POS</p>
        <h1>Sell vehicle parts and create sales invoices.</h1>
        <p>
          Add parts to the cart, attach a customer, then complete the sale. Stock is reduced automatically and a
          sales invoice is stored for reporting and email delivery.
        </p>
      </header>

      {status && <MotionlessStatus status={status} />}

      <div className="sales-pos-grid">
        <div className="sales-pos-card">
          <h2>Parts catalogue</h2>
          <div className="sales-pos-parts-toolbar">
            <input
              className="form-input"
              placeholder="Search parts by name or SKU..."
              value={partsFilter}
              onChange={(event) => setPartsFilter(event.target.value)}
            />
            <button type="button" className="form-button secondary" onClick={() => void loadParts()} disabled={partsLoading}>
              {partsLoading ? <FiLoader size={18} /> : "Refresh"}
            </button>
          </div>

          <div className="sales-pos-parts-list">
            {partsLoading ? (
              <p className="sales-pos-empty">Loading parts...</p>
            ) : filteredParts.length === 0 ? (
              <p className="sales-pos-empty">No parts available to sell.</p>
            ) : (
              filteredParts.map((part) => (
                <article
                  key={part.id}
                  className={`sales-pos-part-row ${part.isLowStock || part.quantityInStock <= 5 ? "low-stock" : ""}`}
                >
                  <div className="sales-pos-part-meta">
                    <strong>{part.name}</strong>
                    <span>
                      {part.partNumber || "No SKU"} · {currency(part.unitPrice)} · Stock {part.quantityInStock}
                    </span>
                  </div>
                  <button type="button" className="form-button secondary" onClick={() => addToCart(part)} disabled={part.quantityInStock <= 0}>
                    <FiPlusCircle size={16} /> Add
                  </button>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="sales-pos-card">
          <h2>Checkout</h2>

          <MotionlessCustomerSection
            customerId={customerId}
            setCustomerId={setCustomerId}
            customerQuery={customerQuery}
            setCustomerQuery={setCustomerQuery}
            customerOptions={customerOptions}
            isSearchingCustomer={isSearchingCustomer}
            onSearch={() => void searchCustomers()}
          />

          <h2>Cart</h2>
          {cart.length === 0 ? (
            <p className="sales-pos-empty">No parts in the cart yet.</p>
          ) : (
            <div className="sales-pos-cart-lines">
              {cart.map((line) => (
                <div key={line.rowId} className="sales-pos-cart-line">
                  <div>
                    <strong>{line.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "#746350" }}>{currency(line.unitPrice)} each</div>
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => updateLineQuantity(line.rowId, Number(event.target.value))}
                  />
                  <strong>{currency(line.unitPrice * line.quantity)}</strong>
                  <button type="button" className="form-button secondary" onClick={() => removeLine(line.rowId)} aria-label="Remove line">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="purchase-invoice-field">
            <span>Discount amount</span>
            <input
              className="purchase-invoice-control"
              type="number"
              min={0}
              step="0.01"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(Number(event.target.value))}
            />
          </label>

          <label className="purchase-invoice-field">
            <span>Paid amount</span>
            <input
              className="purchase-invoice-control"
              type="number"
              min={0}
              step="0.01"
              value={paidAmount}
              onChange={(event) => setPaidAmount(Number(event.target.value))}
            />
          </label>

          <div className="sales-pos-summary">
            <div>
              <span>Subtotal</span>
              <strong>{currency(subtotal)}</strong>
            </div>
            <div>
              <span>After discount (estimate)</span>
              <strong>{currency(estimatedTotal)}</strong>
            </div>
            <MotionlessSummaryRow
              label="Change / credit (estimate)"
              value={currency(Math.max(0, paidAmount - estimatedTotal))}
            />
          </div>

          <div className="sales-pos-actions">
            <button type="button" className="form-button" onClick={() => void submitSale()} disabled={isSubmitting || cart.length === 0}>
              {isSubmitting ? "Processing sale..." : "Complete sale"}
            </button>
            <Link href="/staff/customers" className="form-button secondary" style={{ textAlign: "center", textDecoration: "none" }}>
              Find customer
            </Link>
          </div>

          {createdInvoice && (
            <MotionlessCreatedInvoice invoice={createdInvoice} onEmail={() => void sendInvoiceEmail()} />
          )}
        </div>
      </div>
    </section>
  );
}

function MotionlessStatus({ status }: { status: { tone: "success" | "error"; text: string } }) {
  return <div className={`sales-pos-status ${status.tone}`}>{status.text}</div>;
}

function MotionlessCustomerSection(props: {
  customerId: string;
  setCustomerId: (value: string) => void;
  customerQuery: string;
  setCustomerQuery: (value: string) => void;
  customerOptions: CustomerOption[];
  isSearchingCustomer: boolean;
  onSearch: () => void;
}) {
  return (
    <div className="sales-pos-customer-pick">
      <label className="purchase-invoice-field">
        <span>Find customer (name, phone, vehicle, or ID)</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            className="purchase-invoice-control"
            value={props.customerQuery}
            onChange={(event) => props.setCustomerQuery(event.target.value)}
            placeholder="Search customers..."
          />
          <button type="button" className="form-button secondary" onClick={props.onSearch} disabled={props.isSearchingCustomer}>
            {props.isSearchingCustomer ? "..." : "Search"}
          </button>
        </div>
      </label>

      {props.customerOptions.length > 0 && (
        <select
          className="purchase-invoice-control"
          value={props.customerId}
          onChange={(event) => props.setCustomerId(event.target.value)}
        >
          <option value="">Select customer</option>
          {props.customerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <label className="purchase-invoice-field">
        <span>Customer ID</span>
        <input
          className="purchase-invoice-control"
          value={props.customerId}
          onChange={(event) => props.setCustomerId(event.target.value)}
          placeholder="Customer UUID"
        />
      </label>
    </div>
  );
}

function MotionlessSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MotionlessCreatedInvoice({
  invoice,
  onEmail,
}: {
  invoice: CreatedInvoice;
  onEmail: () => void;
}) {
  return (
    <div className="sales-pos-card" style={{ background: "#f7f1e8" }}>
      <h2>Invoice {invoice.id.slice(0, 8)}…</h2>
      <div className="sales-pos-summary">
        <MotionlessSummaryRow label="Total" value={currency(invoice.totalAmount)} />
        <MotionlessSummaryRow label="Discount applied" value={currency(invoice.discountAmount)} />
        <MotionlessSummaryRow label="Paid" value={currency(invoice.paidAmount)} />
        <MotionlessSummaryRow label="Pending credit" value={currency(invoice.pendingCredit)} />
      </div>
      {invoice.items.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "18px", color: "#5c4934" }}>
          {invoice.items.map((item) => (
            <li key={`${item.partName}-${item.quantity}`}>
              {item.partName} × {item.quantity} ({currency(item.lineTotal)})
            </li>
          ))}
        </ul>
      )}
      <div className="sales-pos-actions">
        <button type="button" className="form-button secondary" onClick={onEmail}>
          Email invoice
        </button>
        <Link href={`/staff/invoices?invoiceId=${invoice.id}`} className="form-button secondary" style={{ textDecoration: "none", textAlign: "center" }}>
          Open invoices
        </Link>
      </div>
    </div>
  );
}
