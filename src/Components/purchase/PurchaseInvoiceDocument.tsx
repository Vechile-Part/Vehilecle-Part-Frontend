"use client";

import { FiDownload, FiPrinter } from "react-icons/fi";
import { formatNpr } from "@/lib/currency";

export type PurchaseInvoiceDocumentData = {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendorContactPerson?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  issuedAtUtc: string;
  totalAmount: number;
  items: {
    partName: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
  }[];
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" });
};

const invoiceRef = (id: string, invoiceNumber?: string) =>
  invoiceNumber?.trim() || id.slice(0, 8).toUpperCase();

const buildPrintableHtml = (invoice: PurchaseInvoiceDocumentData) => {
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.partName)}${item.partNumber ? ` <small>(${escapeHtml(item.partNumber)})</small>` : ""}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatNpr(item.unitPrice)}</td>
        <td style="text-align:right">${formatNpr(item.quantity * item.unitPrice)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Purchase Invoice ${escapeHtml(invoiceRef(invoice.id, invoice.invoiceNumber))}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1f140b; margin: 24px; }
    h1 { font-size: 1.5rem; margin: 0 0 4px; }
    .meta { color: #5c4934; font-size: 0.9rem; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border-bottom: 1px solid #e7dbc7; padding: 10px 8px; text-align: left; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #8a7358; }
    .total { text-align: right; font-size: 1.15rem; font-weight: bold; margin-top: 16px; }
    .brand { font-size: 0.85rem; color: #6f5936; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="brand"><strong>PartTrack</strong> · Vehicle Parts &amp; Service</div>
  <h1>Purchase Invoice ${escapeHtml(invoiceRef(invoice.id, invoice.invoiceNumber))}</h1>
  <p class="meta">Issued: ${escapeHtml(formatDate(invoice.issuedAtUtc))}</p>
  <p><strong>Vendor:</strong> ${escapeHtml(invoice.vendorName)}</p>
  ${invoice.vendorContactPerson ? `<p><strong>Contact:</strong> ${escapeHtml(invoice.vendorContactPerson)}</p>` : ""}
  ${invoice.vendorPhone ? `<p><strong>Phone:</strong> ${escapeHtml(invoice.vendorPhone)}</p>` : ""}
  ${invoice.vendorEmail ? `<p><strong>Email:</strong> ${escapeHtml(invoice.vendorEmail)}</p>` : ""}
  <table>
    <thead>
      <tr><th>Part</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${escapeHtml(formatNpr(invoice.totalAmount))}</p>
  <p class="meta" style="margin-top:32px">Stock quantities were updated when this invoice was recorded.</p>
</body>
</html>`;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Props = {
  invoice: PurchaseInvoiceDocumentData;
  printRootId?: string;
};

export default function PurchaseInvoiceDocument({ invoice, printRootId = "purchase-invoice-print" }: Props) {
  const ref = invoiceRef(invoice.id, invoice.invoiceNumber);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const html = buildPrintableHtml(invoice);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ref.replace(/[^a-zA-Z0-9-]/g, "_")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="purchase-invoice-document" id={printRootId}>
      <div className="purchase-invoice-document-print-brand">
        <strong>PartTrack</strong>
        <span>Vehicle Parts &amp; Service · Purchase invoice</span>
      </div>

      <header className="purchase-invoice-document-head">
        <h2>Purchase invoice {ref}</h2>
        <p className="purchase-invoice-document-meta">{formatDate(invoice.issuedAtUtc)}</p>
      </header>

      <section className="purchase-invoice-document-vendor">
        <h3>Vendor</h3>
        <p className="purchase-invoice-document-vendor-name">{invoice.vendorName}</p>
        {invoice.vendorContactPerson ? (
          <p className="purchase-invoice-document-meta">Contact: {invoice.vendorContactPerson}</p>
        ) : null}
        {invoice.vendorPhone ? (
          <p className="purchase-invoice-document-meta">Phone: {invoice.vendorPhone}</p>
        ) : null}
        {invoice.vendorEmail ? (
          <p className="purchase-invoice-document-meta">Email: {invoice.vendorEmail}</p>
        ) : null}
      </section>

      <div className="purchase-invoice-document-lines">
        <div className="purchase-invoice-document-lines-head" aria-hidden>
          <span>Part</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Total</span>
        </div>
        {invoice.items.length === 0 ? (
          <p className="purchase-recent-muted">No line items.</p>
        ) : (
          invoice.items.map((item, index) => (
            <div key={`${item.partName}-${index}`} className="purchase-invoice-document-line">
              <span>
                <strong>{item.partName}</strong>
                {item.partNumber ? (
                  <small className="purchase-recent-part-code"> {item.partNumber}</small>
                ) : null}
              </span>
              <span>{item.quantity}</span>
              <span>{formatNpr(item.unitPrice)}</span>
              <span>{formatNpr(item.quantity * item.unitPrice)}</span>
            </div>
          ))
        )}
      </div>

      <div className="purchase-invoice-document-total">
        <span>Total</span>
        <strong>{formatNpr(invoice.totalAmount)}</strong>
      </div>

      <p className="purchase-invoice-document-footnote">
        This document was generated from your purchase record. Stock was updated when the invoice was saved.
      </p>

      <div className="purchase-invoice-document-actions">
        <button type="button" className="purchase-invoice-action-btn secondary" onClick={handlePrint}>
          <FiPrinter aria-hidden /> Print / Save as PDF
        </button>
        <button type="button" className="purchase-invoice-action-btn secondary" onClick={handleDownload}>
          <FiDownload aria-hidden /> Download HTML
        </button>
      </div>
    </article>
  );
}
