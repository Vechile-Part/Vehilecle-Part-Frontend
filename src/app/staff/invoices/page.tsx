"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLoader, FiMail, FiPrinter } from "react-icons/fi";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, isUuid, parseJsonSafe } from "@/lib/http";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
};

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
  items: {
    id: string;
    partId: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-NP");
};

const invoiceRef = (id: string, invoiceNumber?: string) =>
  invoiceNumber?.trim() || id.slice(0, 8).toUpperCase();

const normalizeSummary = (record: Record<string, unknown>): InvoiceSummary | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  const invoiceNumber = String(record.invoiceNumber ?? record.InvoiceNumber ?? "");
  return {
    id,
    invoiceNumber: invoiceNumber || id.slice(0, 8).toUpperCase(),
    customerId: String(record.customerId ?? record.CustomerId ?? ""),
    customerName: String(record.customerName ?? record.CustomerName ?? "Customer"),
    customerPhone: String(record.customerPhone ?? record.CustomerPhone ?? ""),
    issuedAtUtc: String(record.issuedAtUtc ?? record.IssuedAtUtc ?? ""),
    totalAmount: Number(record.totalAmount ?? record.TotalAmount ?? 0),
    discountAmount: Number(record.discountAmount ?? record.DiscountAmount ?? 0),
    paidAmount: Number(record.paidAmount ?? record.PaidAmount ?? 0),
    pendingCredit: Number(record.pendingCredit ?? record.PendingCredit ?? 0),
  };
};

const normalizeDetail = (record: Record<string, unknown>): InvoiceDetail | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  const rawItems = Array.isArray(record.items) ? record.items : Array.isArray(record.Items) ? record.Items : [];
  const items = rawItems
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id ?? item.Id ?? ""),
        partId: String(item.partId ?? item.PartId ?? ""),
        partName: String(item.partName ?? item.PartName ?? "Part"),
        quantity: Number(item.quantity ?? item.Quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? item.UnitPrice ?? 0),
        lineTotal: Number(item.lineTotal ?? item.LineTotal ?? 0),
      };
    })
    .filter((item) => item.partName);

  const invoiceNumber = String(record.invoiceNumber ?? record.InvoiceNumber ?? "");
  return {
    id,
    invoiceNumber: invoiceNumber || id.slice(0, 8).toUpperCase(),
    customerId: String(record.customerId ?? record.CustomerId ?? ""),
    issuedAtUtc: String(record.issuedAtUtc ?? record.IssuedAtUtc ?? ""),
    totalAmount: Number(record.totalAmount ?? record.TotalAmount ?? 0),
    discountAmount: Number(record.discountAmount ?? record.DiscountAmount ?? 0),
    paidAmount: Number(record.paidAmount ?? record.PaidAmount ?? 0),
    pendingCredit: Number(record.pendingCredit ?? record.PendingCredit ?? 0),
    items,
  };
};

function SalesInvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("invoiceId") ?? "";

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [customerLabel, setCustomerLabel] = useState("");
  const [filter, setFilter] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch("/api/staff/sales-invoices");
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setInvoices(
          data
            .map((row) => normalizeSummary(row as Record<string, unknown>))
            .filter((row): row is InvoiceSummary => row !== null),
        );
      } else {
        setInvoices([]);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(
    async (invoiceId: string, summary?: InvoiceSummary) => {
      if (!isUuid(invoiceId)) {
        setDetail(null);
        setCustomerLabel("");
        return;
      }

      setLoadingDetail(true);
      setEmailStatus(null);
      try {
        const res = await apiFetch(`/api/staff/sales-invoices/${invoiceId}`);
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          setDetail(null);
          setCustomerLabel("");
          return;
        }

        const parsed = normalizeDetail((typeof data === "object" && data ? data : {}) as Record<string, unknown>);
        setDetail(parsed);
        if (summary) {
          setCustomerLabel(summary.customerPhone ? `${summary.customerName} · ${summary.customerPhone}` : summary.customerName);
        } else if (parsed?.customerId && isUuid(parsed.customerId)) {
          const custRes = await apiFetch(`/api/staff/customers/${parsed.customerId}`);
          const custData = await parseJsonSafe(custRes);
          if (custRes.ok && typeof custData === "object" && custData) {
            const c = custData as Record<string, unknown>;
            const name = String(c.fullName ?? c.FullName ?? "Customer");
            const phone = String(c.phone ?? c.Phone ?? "");
            setCustomerLabel(phone ? `${name} · ${phone}` : name);
          } else {
            setCustomerLabel("Customer");
          }
        }
      } catch {
        setDetail(null);
        setCustomerLabel("");
      } finally {
        setLoadingDetail(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setCustomerLabel("");
      return;
    }
    const summary = invoices.find((row) => row.id === selectedId);
    void loadDetail(selectedId, summary);
  }, [selectedId, invoices, loadDetail]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter(
      (row) =>
        row.customerName.toLowerCase().includes(term) ||
        row.customerPhone.toLowerCase().includes(term) ||
        row.id.toLowerCase().includes(term) ||
        invoiceRef(row.id, row.invoiceNumber).toLowerCase().includes(term),
    );
  }, [invoices, filter]);

  const selectInvoice = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("invoiceId", id);
    router.replace(`/staff/invoices?${params.toString()}`);
  };

  const sendEmail = async () => {
    if (!detail?.id) return;
    setEmailStatus(null);
    try {
      const res = await apiFetch(`/api/staff/sales-invoices/${detail.id}/send-email`, { method: "POST" });
      const data = await parseJsonSafe(res);
      setEmailStatus(
        res.ok
          ? { tone: "success", text: "Invoice emailed to the customer." }
          : { tone: "error", text: extractApiError(data, "Could not send invoice email.") },
      );
    } catch {
      setEmailStatus({ tone: "error", text: "Email request failed." });
    }
  };

  const subtotalBeforeDiscount = detail ? detail.totalAmount + detail.discountAmount : 0;

  return (
    <section className="sales-invoices-page">
      <header className="sales-invoices-header">
        <h1>Sales invoices</h1>
        <p>Browse completed POS sales, open full line-item detail, print, or email the customer.</p>
      </header>

      {emailStatus && <div className={`sales-invoices-status ${emailStatus.tone}`}>{emailStatus.text}</div>}

      <div className="sales-invoices-layout">
        <div className="sales-invoices-list-card">
          <div className="sales-invoices-list-head">
            <h2>All invoices ({invoices.length})</h2>
          </div>
          <div className="sales-invoices-toolbar">
            <input
              className="sales-invoices-search"
              placeholder="Search customer, phone, or invoice ref…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Search invoices"
            />
          </div>
          <div className="sales-invoices-list">
            {loadingList ? (
              <p className="sales-invoices-empty">
                <FiLoader aria-hidden /> Loading invoices…
              </p>
            ) : filtered.length === 0 ? (
              <p className="sales-invoices-empty">No sales invoices found.</p>
            ) : (
              filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`sales-invoices-row ${selectedId === row.id ? "active" : ""}`}
                  onClick={() => selectInvoice(row.id)}
                >
                  <div className="sales-invoices-row-top">
                    <strong>{row.customerName}</strong>
                    <span>{formatNpr(row.totalAmount)}</span>
                  </div>
                  <span className="sales-invoices-row-meta">
                    {invoiceRef(row.id, row.invoiceNumber)} · {formatDate(row.issuedAtUtc)}
                  </span>
                  {row.pendingCredit > 0 ? (
                    <span className="sales-invoices-badge credit">Credit {formatNpr(row.pendingCredit)}</span>
                  ) : (
                    <span className="sales-invoices-badge paid">Paid in full</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <article className="sales-invoices-detail-card" id="sales-invoice-print">
          {!selectedId || !isUuid(selectedId) ? (
            <p className="sales-invoices-detail-empty">Select an invoice from the list to view details.</p>
          ) : loadingDetail || !detail ? (
            <p className="sales-invoices-detail-empty">
              {loadingDetail ? (
                <>
                  <FiLoader aria-hidden /> Loading invoice…
                </>
              ) : (
                "Invoice could not be loaded."
              )}
            </p>
          ) : (
            <>
              <div className="sales-invoices-print-brand">
                <strong>PartTrack</strong>
                <span>Vehicle Parts &amp; Service · Sales invoice</span>
              </div>
              <div className="sales-invoices-detail-head">
                <h2>Invoice {invoiceRef(detail.id, detail.invoiceNumber)}</h2>
                <p className="sales-invoices-detail-id">{detail.id}</p>
                <p className="sales-invoices-row-meta">{formatDate(detail.issuedAtUtc)}</p>
                {customerLabel && <p className="sales-invoices-row-meta">{customerLabel}</p>}
              </div>

              <div className="sales-invoices-detail-body">
                <div className="sales-invoices-lines">
                  <div className="sales-invoices-lines-head" aria-hidden>
                    <span>Part</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>Total</span>
                  </div>
                  {detail.items.length === 0 ? (
                    <p className="sales-invoices-empty">No line items on this invoice.</p>
                  ) : (
                    detail.items.map((item) => (
                      <div key={item.id || `${item.partId}-${item.quantity}`} className="sales-invoices-line">
                        <strong>{item.partName}</strong>
                        <span>{item.quantity}</span>
                        <span>{formatNpr(item.unitPrice)}</span>
                        <span>{formatNpr(item.lineTotal || item.unitPrice * item.quantity)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="sales-invoices-totals">
                  <div className="sales-invoices-total-row">
                    <span>Subtotal</span>
                    <strong>{formatNpr(subtotalBeforeDiscount)}</strong>
                  </div>
                  {detail.discountAmount > 0 && (
                    <div className="sales-invoices-total-row">
                      <span>Discount</span>
                      <strong>−{formatNpr(detail.discountAmount)}</strong>
                    </div>
                  )}
                  <div className="sales-invoices-total-row grand">
                    <span>Total</span>
                    <strong>{formatNpr(detail.totalAmount)}</strong>
                  </div>
                  <div className="sales-invoices-total-row">
                    <span>Paid</span>
                    <strong>{formatNpr(detail.paidAmount)}</strong>
                  </div>
                  {detail.pendingCredit > 0 && (
                    <div className="sales-invoices-total-row">
                      <span>Pending credit</span>
                      <strong>{formatNpr(detail.pendingCredit)}</strong>
                    </div>
                  )}
                </div>

                <div className="sales-invoices-actions">
                  <button type="button" className="sales-invoices-btn secondary" onClick={() => window.print()}>
                    <FiPrinter size={16} aria-hidden /> Print
                  </button>
                  <button type="button" className="sales-invoices-btn" onClick={() => void sendEmail()}>
                    <FiMail size={16} aria-hidden /> Email customer
                  </button>
                  {isUuid(detail.customerId) && (
                    <Link
                      href={`/staff/customers?customerId=${detail.customerId}`}
                      className="sales-invoices-btn secondary"
                    >
                      View customer
                    </Link>
                  )}
                  <Link href="/pos" className="sales-invoices-btn secondary">
                    New sale
                  </Link>
                </div>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

export default function StaffInvoicesPage() {
  return (
    <Suspense
      fallback={
        <section className="sales-invoices-page">
          <p className="sales-invoices-empty">Loading sales invoices…</p>
        </section>
      }
    >
      <SalesInvoicesContent />
    </Suspense>
  );
}

