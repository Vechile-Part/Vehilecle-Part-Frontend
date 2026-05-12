"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { FiFileText, FiLoader, FiPlusCircle, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;
const TAX_RATE = 0.08;
const SHIPPING_COST = 45;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  sku: string;
  unitPrice: number;
  badge: string;
  accent: string;
};

type LivePart = {
  id: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  quantityInStock: number;
  isLowStock: boolean;
};

type InvoiceLine = {
  rowId: string;
  templateId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  description: string;
  sku: string;
  badge: string;
  accent: string;
};

type PurchaseInvoiceItem = {
  partId: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseInvoiceRecord = {
  id: string;
  vendorId: string;
  issuedAtUtc: string;
  totalAmount: number;
  items: PurchaseInvoiceItem[];
};

type StatusMessage = {
  tone: "success" | "error";
  text: string;
};

const catalog: CatalogItem[] = [
  {
    id: "hydraulic-valve-tappet",
    name: "Hydraulic Valve Tappet",
    description: "Template item",
    sku: "HVT-9920-XL",
    unitPrice: 45,
    badge: "HV",
    accent: "#83512E",
  },
  {
    id: "chrome-ball-bearing-set",
    name: "Chrome Ball Bearing Set",
    description: "Template item",
    sku: "BBS-004-CH",
    unitPrice: 12.5,
    badge: "BB",
    accent: "#C48B54",
  },
  {
    id: "performance-timing-chain",
    name: "Performance Timing Chain",
    description: "Template item",
    sku: "PTC-117-DX",
    unitPrice: 87,
    badge: "TC",
    accent: "#5F6D77",
  },
  {
    id: "ceramic-spark-plug-kit",
    name: "Ceramic Spark Plug Kit",
    description: "Template item",
    sku: "SPK-220-CR",
    unitPrice: 26,
    badge: "SP",
    accent: "#B27A5C",
  },
];

const accentPalette = ["#83512E", "#C48B54", "#5F6D77", "#B27A5C", "#7C5D35", "#44656A"];

const currencyFormatter = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (amount: number) => currencyFormatter.format(amount);

const formatReferenceDate = (value: string) => value.replaceAll("-", "");

const formatIssuedAt = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const makeRowId = () => `line-${Math.random().toString(36).slice(2, 10)}`;

const makeBadge = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "PT";

const getAccentFromKey = (value: string) => {
  const total = value.split("").reduce((sum, chunk) => sum + chunk.charCodeAt(0), 0);
  return accentPalette[total % accentPalette.length];
};

const buildLineItem = (catalogId = catalog[0]?.id ?? "", quantity = 1): InvoiceLine => {
  const catalogItem = catalog.find((item) => item.id === catalogId) ?? catalog[0];

  return {
    rowId: makeRowId(),
    templateId: catalogItem?.id ?? "",
    partId: "",
    quantity,
    unitPrice: catalogItem?.unitPrice ?? 0,
    name: catalogItem?.name ?? "Invoice Line",
    description: catalogItem?.description ?? "Template item",
    sku: catalogItem?.sku ?? "",
    badge: catalogItem?.badge ?? "PT",
    accent: catalogItem?.accent ?? "#83512E",
  };
};

const createReferenceNumber = (dateValue: string) =>
  `PINV-${formatReferenceDate(dateValue)}-${String(Math.floor(Math.random() * 900) + 100)}`;

const authHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof window === "undefined") return headers;

  const token = localStorage.getItem("authToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const jsonHeaders = (): Record<string, string> => ({
  ...authHeaders(),
  "Content-Type": "application/json",
});

const readResponsePayload = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readField = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const readString = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = readField(record, ...keys);
  return typeof value === "string" ? value : "";
};

const readNumber = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = readField(record, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const readBoolean = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = readField(record, ...keys);
  return typeof value === "boolean" ? value : false;
};

const normalizeInvoiceItem = (value: unknown): PurchaseInvoiceItem | null => {
  const record = asRecord(value);
  if (!record) return null;

  const partId = readString(record, "partId", "PartId").trim();
  if (!partId) return null;

  return {
    partId,
    quantity: Math.max(1, Math.trunc(readNumber(record, "quantity", "Quantity"))),
    unitPrice: Math.max(0, readNumber(record, "unitPrice", "UnitPrice")),
  };
};

const normalizeInvoice = (value: unknown): PurchaseInvoiceRecord | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id", "Id").trim();
  const vendorId = readString(record, "vendorId", "VendorId").trim();
  if (!id || !vendorId) return null;

  const itemsValue = readField(record, "items", "Items");
  const items = Array.isArray(itemsValue)
    ? itemsValue.map(normalizeInvoiceItem).filter((item): item is PurchaseInvoiceItem => item !== null)
    : [];

  return {
    id,
    vendorId,
    issuedAtUtc: readString(record, "issuedAtUtc", "IssuedAtUtc"),
    totalAmount: Math.max(0, readNumber(record, "totalAmount", "TotalAmount")),
    items,
  };
};

const normalizeInvoices = (value: unknown): PurchaseInvoiceRecord[] => {
  if (Array.isArray(value)) {
    return value
      .map(normalizeInvoice)
      .filter((invoice): invoice is PurchaseInvoiceRecord => invoice !== null);
  }

  const record = asRecord(value);
  if (!record) return [];

  const nestedValue = readField(record, "value", "Value");
  return Array.isArray(nestedValue)
    ? nestedValue
        .map(normalizeInvoice)
        .filter((invoice): invoice is PurchaseInvoiceRecord => invoice !== null)
    : [];
};

const normalizePart = (value: unknown): LivePart | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = readString(record, "id", "Id").trim();
  const name = readString(record, "name", "Name").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    partNumber: readString(record, "partNumber", "PartNumber"),
    unitPrice: Math.max(0, readNumber(record, "unitPrice", "UnitPrice")),
    quantityInStock: Math.max(0, Math.trunc(readNumber(record, "quantityInStock", "QuantityInStock"))),
    isLowStock: readBoolean(record, "isLowStock", "IsLowStock"),
  };
};

const normalizeParts = (value: unknown): LivePart[] => {
  if (!Array.isArray(value)) return [];

  return value.map(normalizePart).filter((part): part is LivePart => part !== null);
};

const toErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  const record = asRecord(payload);
  if (!record) return fallback;

  return (
    readString(record, "message", "Message", "error", "Error", "title", "Title").trim() || fallback
  );
};

const isUuid = (value: string) => UUID_PATTERN.test(value.trim());

const shortenId = (value: string) =>
  value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;

export default function AdminPurchaseInvoicesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [vendorId, setVendorId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [referenceNumber, setReferenceNumber] = useState(createReferenceNumber(today));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([buildLineItem()]);
  const [recentInvoices, setRecentInvoices] = useState<PurchaseInvoiceRecord[]>([]);
  const [liveParts, setLiveParts] = useState<LivePart[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [invoiceFeedError, setInvoiceFeedError] = useState("");
  const [partsMessage, setPartsMessage] = useState("");

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const estimatedTax = subtotal * TAX_RATE;
  const landedEstimate = subtotal + estimatedTax + SHIPPING_COST;

  const recentVendorIds = Array.from(new Set(recentInvoices.map((invoice) => invoice.vendorId))).slice(0, 8);
  const suggestedPartIds = Array.from(
    new Set([
      ...liveParts.map((part) => part.id),
      ...recentInvoices.flatMap((invoice) => invoice.items.map((item) => item.partId)),
    ]),
  ).slice(0, 20);

  const updateLine = (rowId: string, updater: (line: InvoiceLine) => InvoiceLine) => {
    setLines((currentLines) =>
      currentLines.map((line) => (line.rowId === rowId ? updater(line) : line)),
    );
  };

  const refreshRecentInvoices = async () => {
    setIsLoadingInvoices(true);
    setInvoiceFeedError("");

    try {
      const response = await fetch(`${API}/api/purchase-invoices`, {
        headers: { Accept: "application/json" },
      });
      const payload = await readResponsePayload(response);

      if (!response.ok) {
        setInvoiceFeedError(
          toErrorMessage(payload, `Live invoice feed returned ${response.status}.`),
        );
        setRecentInvoices([]);
        return;
      }

      const nextInvoices = normalizeInvoices(payload).sort(
        (left, right) =>
          new Date(right.issuedAtUtc).getTime() - new Date(left.issuedAtUtc).getTime(),
      );

      setRecentInvoices(nextInvoices);
      if (nextInvoices.length === 0) {
        setInvoiceFeedError("No purchase invoices found yet.");
      }
    } catch {
      setRecentInvoices([]);
      setInvoiceFeedError(
        "Could not load purchase invoices.",
      );
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const loadLiveParts = async () => {
    setIsLoadingParts(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) {
      setLiveParts([]);
      setPartsMessage(
        "Sign in as admin to load part IDs automatically, or enter them manually.",
      );
      setIsLoadingParts(false);
      return;
    }

    try {
      const response = await fetch(`${API}/api/parts`, {
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        setLiveParts([]);
        setPartsMessage(
          "Your account cannot load parts automatically. Enter part IDs manually.",
        );
        return;
      }

      const payload = await readResponsePayload(response);

      if (!response.ok) {
        setLiveParts([]);
        setPartsMessage(
          toErrorMessage(payload, `The admin parts endpoint returned ${response.status}.`),
        );
        return;
      }

      const nextParts = normalizeParts(payload);
      setLiveParts(nextParts);
      setPartsMessage(
        nextParts.length > 0
          ? `Loaded ${nextParts.length} parts.`
          : "No parts were returned.",
      );
    } catch {
      setLiveParts([]);
      setPartsMessage(
        "Could not load parts automatically. Enter part IDs manually.",
      );
    } finally {
      setIsLoadingParts(false);
    }
  };

  useEffect(() => {
    void refreshRecentInvoices();
    void loadLiveParts();
  }, []);

  const applyTemplateSelection = (rowId: string, templateId: string) => {
    const nextTemplate = catalog.find((item) => item.id === templateId);
    if (!nextTemplate) return;

    updateLine(rowId, (line) => ({
      ...line,
      templateId: nextTemplate.id,
      name: nextTemplate.name,
      description: nextTemplate.description,
      sku: nextTemplate.sku,
      unitPrice: nextTemplate.unitPrice,
      badge: nextTemplate.badge,
      accent: nextTemplate.accent,
    }));
  };

  const applyLivePartSelection = (rowId: string, partId: string) => {
    const selectedPart = liveParts.find((part) => part.id === partId);
    if (!selectedPart) return;

    updateLine(rowId, (line) => ({
      ...line,
      partId: selectedPart.id,
      name: selectedPart.name,
      description: selectedPart.isLowStock
        ? `In stock: ${selectedPart.quantityInStock} • low stock`
        : `In stock: ${selectedPart.quantityInStock}`,
      sku: selectedPart.partNumber,
      unitPrice: selectedPart.unitPrice,
      badge: makeBadge(selectedPart.name),
      accent: getAccentFromKey(selectedPart.id),
    }));
  };

  const handleLineSelectionChange = (rowId: string, selectedValue: string) => {
    if (liveParts.length > 0) {
      applyLivePartSelection(rowId, selectedValue);
      return;
    }

    applyTemplateSelection(rowId, selectedValue);
  };

  const handlePartIdChange = (rowId: string, value: string) => {
    const nextPartId = value.trim();
    const matchedPart = liveParts.find((part) => part.id === nextPartId);

    if (matchedPart) {
      applyLivePartSelection(rowId, matchedPart.id);
      return;
    }

    updateLine(rowId, (line) => ({
      ...line,
      partId: value,
    }));
  };

  const handleUnitPriceChange = (rowId: string, value: string) => {
    const nextPrice = Number(value);

    updateLine(rowId, (line) => ({
      ...line,
      unitPrice: Number.isFinite(nextPrice) ? Math.max(0, nextPrice) : line.unitPrice,
    }));
  };

  const handleQuantityChange = (rowId: string, value: string) => {
    const nextQuantity = Number(value);

    updateLine(rowId, (line) => ({
      ...line,
      quantity: Number.isFinite(nextQuantity) ? Math.max(1, Math.trunc(nextQuantity)) : line.quantity,
    }));
  };

  const addLineItem = () => {
    const nextTemplate = catalog[lines.length % catalog.length];
    setLines((currentLines) => [...currentLines, buildLineItem(nextTemplate.id)]);
  };

  const removeLineItem = (rowId: string) => {
    setLines((currentLines) => {
      if (currentLines.length === 1) return currentLines;
      return currentLines.filter((line) => line.rowId !== rowId);
    });
  };

  const submitInvoice = async () => {
    const trimmedVendorId = vendorId.trim();

    if (!trimmedVendorId) {
      setStatus({
        tone: "error",
        text: "Enter a vendor ID before submitting.",
      });
      return;
    }

    if (!isUuid(trimmedVendorId)) {
      setStatus({
        tone: "error",
        text: "Vendor ID format is invalid.",
      });
      return;
    }

    const lineWithoutPartId = lines.find((line) => !line.partId.trim());
    if (lineWithoutPartId) {
      setStatus({
        tone: "error",
        text: `Add a part ID for ${lineWithoutPartId.name} before submitting.`,
      });
      return;
    }

    const lineWithInvalidPartId = lines.find((line) => !isUuid(line.partId));
    if (lineWithInvalidPartId) {
      setStatus({
        tone: "error",
        text: `Part ID for ${lineWithInvalidPartId.name} is invalid.`,
      });
      return;
    }

    const lineWithInvalidPrice = lines.find((line) => line.unitPrice <= 0);
    if (lineWithInvalidPrice) {
      setStatus({
        tone: "error",
        text: `Unit price for ${lineWithInvalidPrice.name} must be greater than zero.`,
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch(`${API}/api/purchase-invoices`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          vendorId: trimmedVendorId,
          items: lines.map((line) => ({
            partId: line.partId.trim(),
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice.toFixed(2)),
          })),
        }),
      });

      const payload = await readResponsePayload(response);

      if (!response.ok) {
        setStatus({
          tone: "error",
          text: toErrorMessage(
            payload,
            "Invoice was rejected. Check the vendor ID and part IDs.",
          ),
        });
        return;
      }

      const createdInvoice = normalizeInvoice(payload);
      setStatus({
        tone: "success",
        text: createdInvoice
          ? `Backend invoice ${shortenId(createdInvoice.id)} was created with ${createdInvoice.items.length} line item(s).`
          : "Invoice submitted successfully.",
      });

      setLines([buildLineItem()]);
      setNotes("");
      setReferenceNumber(createReferenceNumber(invoiceDate));
      await refreshRecentInvoices();
      await loadLiveParts();
    } catch {
      setStatus({
        tone: "error",
        text: "Invoice could not be submitted. Check the server connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="purchase-invoice-page">
      <header className="purchase-invoice-header">
        <p className="purchase-invoice-kicker">Create Purchase Invoice</p>
        <h1 className="purchase-invoice-title">Record incoming stock from vendors.</h1>
        <p className="purchase-invoice-description">
          Create a purchase invoice, review line totals, and submit the stock intake for processing.
        </p>
      </header>

      {status ? (
        <div className={`purchase-invoice-status ${status.tone}`}>{status.text}</div>
      ) : null}

      <div className="purchase-invoice-callout info">
        One submission creates one purchase invoice.
      </div>

      <section className="purchase-invoice-card">
        <div className="purchase-invoice-card-heading purchase-invoice-card-heading-row">
          <div>
            <h2>Recent Invoices</h2>
            <p className="purchase-invoice-section-copy">
              Latest submitted purchase invoices.
            </p>
          </div>

          <button
            className="purchase-invoice-add-button"
            type="button"
            onClick={() => {
              void refreshRecentInvoices();
              void loadLiveParts();
            }}
            disabled={isLoadingInvoices || isLoadingParts}
          >
            {isLoadingInvoices || isLoadingParts ? <FiLoader size={18} /> : <FiRefreshCw size={18} />}
            Refresh Live Data
          </button>
        </div>

        <div className="purchase-invoice-metadata-row">
          <span>
            {isLoadingInvoices
              ? "Loading invoices..."
              : `${recentInvoices.length} invoice${recentInvoices.length === 1 ? "" : "s"} loaded`}
          </span>
          <span>
            {isLoadingParts
              ? "Loading admin parts..."
              : liveParts.length > 0
                ? `${liveParts.length} parts available`
                : "Manual part entry mode"}
          </span>
        </div>

        {invoiceFeedError ? (
          <div className="purchase-invoice-callout warning">{invoiceFeedError}</div>
        ) : null}

        {partsMessage ? (
          <div className={`purchase-invoice-callout ${liveParts.length > 0 ? "info" : "warning"}`}>
            {partsMessage}
          </div>
        ) : null}

        <div className="purchase-invoice-recent-grid">
          {recentInvoices.slice(0, 6).map((invoice) => (
            <article className="purchase-invoice-recent-card" key={invoice.id}>
              <p className="purchase-invoice-recent-label">Invoice ID</p>
              <h3>{shortenId(invoice.id)}</h3>
              <div className="purchase-invoice-recent-meta">
                <span>{formatIssuedAt(invoice.issuedAtUtc)}</span>
                <span>{invoice.items.length} line item{invoice.items.length === 1 ? "" : "s"}</span>
              </div>
              <div className="purchase-invoice-recent-summary">
                <span>Vendor {shortenId(invoice.vendorId)}</span>
                <strong>{formatCurrency(invoice.totalAmount)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="purchase-invoice-card">
        <div className="purchase-invoice-card-heading">
          <h2>General Details</h2>
        </div>

        <div className="purchase-invoice-fields">
          <label className="purchase-invoice-field">
            <span>Vendor UUID</span>
            <input
              className="purchase-invoice-control"
              list="purchase-vendor-suggestions"
              type="text"
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
            />
            <datalist id="purchase-vendor-suggestions">
              {recentVendorIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
            <small className="purchase-invoice-helper-text">
              Recent vendor IDs are suggested when available.
            </small>
          </label>

          <label className="purchase-invoice-field">
            <span>Invoice Date</span>
            <input
              className="purchase-invoice-control"
              type="date"
              value={invoiceDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setInvoiceDate(nextDate);
                setReferenceNumber((currentReference) => {
                  if (!currentReference.startsWith("PINV-")) return currentReference;
                  return `PINV-${formatReferenceDate(nextDate)}-${currentReference.slice(-3)}`;
                });
              }}
            />
          </label>

          <label className="purchase-invoice-field">
            <span>Reference #</span>
            <input
              className="purchase-invoice-control"
              type="text"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              placeholder="PINV-20260512-001"
            />
          </label>
        </div>
      </section>

      <section className="purchase-invoice-card">
        <div className="purchase-invoice-card-heading purchase-invoice-card-heading-row">
          <div>
            <h2>Itemized Parts List</h2>
            <p className="purchase-invoice-section-copy">
              {liveParts.length > 0
                ? "Selecting a part fills in its ID and current unit price."
                : "Use the item list for drafting and enter the correct part ID before submitting."}
            </p>
          </div>

          <button className="purchase-invoice-add-button" type="button" onClick={addLineItem}>
            <FiPlusCircle size={18} />
            Add New Line Item
          </button>
        </div>

        <div className="purchase-invoice-table purchase-invoice-table-head" aria-hidden="true">
          <span>Product Details</span>
          <span>SKU / Code</span>
          <span>Unit Price</span>
          <span>Quantity</span>
          <span>Total</span>
          <span />
        </div>

        <div className="purchase-invoice-line-list">
          {lines.map((line) => {
            const lineTotal = line.unitPrice * line.quantity;
            const thumbStyle = { "--purchase-accent": line.accent } as CSSProperties;

            return (
              <article className="purchase-invoice-table purchase-invoice-line" key={line.rowId}>
                <div className="purchase-invoice-cell purchase-invoice-product-cell">
                  <span className="purchase-invoice-mobile-label">Product Details</span>
                  <div className="purchase-invoice-product">
                    <div className="purchase-invoice-thumb" style={thumbStyle}>
                      {line.badge}
                    </div>
                    <div className="purchase-invoice-product-meta">
                      <select
                        className="purchase-invoice-product-select"
                        value={liveParts.length > 0 ? line.partId : line.templateId}
                        onChange={(event) => handleLineSelectionChange(line.rowId, event.target.value)}
                        aria-label="Select product"
                      >
                        {liveParts.length > 0 ? (
                          <>
                            <option value="">Select part</option>
                            {liveParts.map((part) => (
                              <option key={part.id} value={part.id}>
                                {part.name} ({part.partNumber || shortenId(part.id)})
                              </option>
                            ))}
                          </>
                        ) : (
                          catalog.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))
                        )}
                      </select>
                      <p>{line.description}</p>
                      <input
                        className="purchase-invoice-inline-input"
                        list="purchase-part-suggestions"
                        type="text"
                        value={line.partId}
                        onChange={(event) => handlePartIdChange(line.rowId, event.target.value)}
                        placeholder="Part UUID"
                      />
                    </div>
                  </div>
                </div>

                <div className="purchase-invoice-cell">
                  <span className="purchase-invoice-mobile-label">SKU / Code</span>
                  <span className="purchase-invoice-value">{line.sku || "Manual entry"}</span>
                </div>

                <label className="purchase-invoice-cell purchase-invoice-input-cell">
                  <span className="purchase-invoice-mobile-label">Unit Price</span>
                  <span className="purchase-invoice-mobile-label">NPR</span>
                  <input
                    className="purchase-invoice-inline-number"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) => handleUnitPriceChange(line.rowId, event.target.value)}
                  />
                </label>

                <label className="purchase-invoice-cell purchase-invoice-input-cell">
                  <span className="purchase-invoice-mobile-label">Quantity</span>
                  <input
                    className="purchase-invoice-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(event) => handleQuantityChange(line.rowId, event.target.value)}
                  />
                </label>

                <div className="purchase-invoice-cell purchase-invoice-total-cell">
                  <span className="purchase-invoice-mobile-label">Total</span>
                  <span className="purchase-invoice-value strong">{formatCurrency(lineTotal)}</span>
                </div>

                <div className="purchase-invoice-cell purchase-invoice-action-cell">
                  <button
                    className="purchase-invoice-delete-button"
                    type="button"
                    onClick={() => removeLineItem(line.rowId)}
                    aria-label={`Remove ${line.name}`}
                    disabled={lines.length === 1}
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <datalist id="purchase-part-suggestions">
          {suggestedPartIds.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      </section>

      <div className="purchase-invoice-lower-grid">
        <section className="purchase-invoice-card purchase-invoice-notes-card">
          <div className="purchase-invoice-card-heading">
            <h2>Receiving Notes</h2>
          </div>

          <p className="purchase-invoice-section-copy">
            Add receiving or warehouse notes for staff reference.
          </p>

          <textarea
            className="purchase-invoice-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add shipping conditions, warehouse location, or quality check notes for staff reference..."
          />
        </section>

        <section className="purchase-invoice-card purchase-invoice-summary-card">
          <div className="purchase-invoice-summary">
            <div className="purchase-invoice-summary-row">
              <span>Invoice Total</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="purchase-invoice-summary-row">
              <span>Tax Estimate</span>
              <strong>{formatCurrency(estimatedTax)}</strong>
            </div>
            <div className="purchase-invoice-summary-row">
              <span>Shipping Estimate</span>
              <strong>{formatCurrency(SHIPPING_COST)}</strong>
            </div>
            <div className="purchase-invoice-summary-divider" />
            <div className="purchase-invoice-summary-row total">
              <span>Landed Cost Estimate</span>
              <strong>{formatCurrency(landedEstimate)}</strong>
            </div>
          </div>

          <p className="purchase-invoice-summary-note">
            Review totals before submitting the invoice.
          </p>

          <button
            className="purchase-invoice-submit-button"
            type="button"
            onClick={submitInvoice}
            disabled={isSubmitting}
          >
            <FiFileText size={18} />
            {isSubmitting ? "Submitting Invoice..." : "Submit Invoice"}
          </button>
        </section>
      </div>
    </section>
  );
}
