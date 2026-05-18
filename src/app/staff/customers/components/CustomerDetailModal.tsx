"use client";

import { FiClock, FiDownload, FiFilter, FiMail, FiPhone, FiTruck, FiX } from "react-icons/fi";
import { formatNpr } from "@/lib/currency";
import type { CustomerProfile, FilterMode, PurchaseInvoice, SearchCustomer, VehicleItem } from "../lib/types";
import { formatDateParts, getHistoryStatusClass, initialsFromName } from "../lib/utils";

export type CustomerDetailModalProps = {
  selectedCustomerId: string;
  profile: CustomerProfile;
  selectedSummary: SearchCustomer;
  detailError: string | null;
  isLoadingHistory: boolean;
  totalOrders: number;
  lifetimeValue: number;
  openCredit: number;
  customerRecordId: string;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  historyPage: number;
  onHistoryPageChange: (page: number) => void;
  pageCount: number;
  paginatedHistory: PurchaseInvoice[];
  filteredHistoryLength: number;
  vehicles: VehicleItem[];
  onClose: () => void;
  onExportHistory: () => void;
};

export function CustomerDetailModal({
  selectedCustomerId,
  profile,
  selectedSummary,
  detailError,
  isLoadingHistory,
  totalOrders,
  lifetimeValue,
  openCredit,
  customerRecordId,
  filterMode,
  onFilterModeChange,
  historyPage,
  onHistoryPageChange,
  pageCount,
  paginatedHistory,
  filteredHistoryLength,
  vehicles,
  onClose,
  onExportHistory,
}: CustomerDetailModalProps) {
  if (!selectedCustomerId) return null;

  return (
    <div
      className="modal-overlay customer-directory-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-detail-modal-title"
      onClick={onClose}
    >
      <div className="modal-container customer-directory-modal" onClick={(event) => event.stopPropagation()}>
        <header className="customer-directory-modal-toolbar">
          <div className="customer-modal-head">
            <div className="customer-modal-avatar" aria-hidden>
              {initialsFromName(profile.fullName || selectedSummary.fullName)}
            </div>
            <div className="customer-modal-head-text">
              <p className="customer-directory-modal-kicker">Customer</p>
              <h2 id="customer-detail-modal-title" className="customer-directory-modal-title">
                {profile.fullName || selectedSummary.fullName}
              </h2>
              <div className="customer-modal-contact">
                <span>
                  <FiPhone size={14} aria-hidden />
                  {profile.phone || selectedSummary.phone || "—"}
                </span>
                <span>
                  <FiMail size={14} aria-hidden />
                  {profile.email || selectedSummary.email || "—"}
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="customer-directory-modal-close" onClick={onClose} aria-label="Close customer details">
            <FiX size={22} />
          </button>
        </header>

        {detailError ? (
          <div className={`customer-directory-status error customer-directory-modal-error`}>{detailError}</div>
        ) : isLoadingHistory ? (
          <div className="customer-directory-modal-loading">Loading customer record…</div>
        ) : (
          <div className="customer-directory-modal-body customer-modal-body">
            <div className="customer-modal-stats">
              <div className="customer-modal-stat">
                <span>Orders</span>
                <strong>{totalOrders}</strong>
              </div>
              <div className="customer-modal-stat">
                <span>Lifetime sales</span>
                <strong>{formatNpr(lifetimeValue)}</strong>
              </div>
              <div className={`customer-modal-stat ${openCredit > 0 ? "warn" : ""}`}>
                <span>Credit due</span>
                <strong>{formatNpr(openCredit)}</strong>
              </div>
            </div>

            <div className="customer-modal-layout">
              <section className="customer-modal-panel">
                <div className="customer-modal-panel-head">
                  <h3>
                    <FiClock size={18} aria-hidden />
                    Purchase history
                  </h3>
                  <div className="customer-modal-panel-actions">
                    <label className="customer-directory-filter">
                      <FiFilter size={15} aria-hidden />
                      <select
                        value={filterMode}
                        onChange={(event) => {
                          onFilterModeChange(event.target.value as FilterMode);
                          onHistoryPageChange(1);
                        }}
                      >
                        <option value="all">All</option>
                        <option value="delivered">Delivered</option>
                        <option value="pending">Pending</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="customer-directory-export-button"
                      onClick={onExportHistory}
                      disabled={filteredHistoryLength === 0}
                    >
                      <FiDownload size={15} aria-hidden />
                      Export CSV
                    </button>
                  </div>
                </div>

                {paginatedHistory.length === 0 ? (
                  <p className="customer-modal-empty">No purchases match this filter.</p>
                ) : (
                  <ul className="customer-modal-invoice-list">
                    {paginatedHistory.map((invoice) => {
                      const dateParts = formatDateParts(invoice.issuedAtUtc);
                      const itemsLabel =
                        invoice.purchasedItems.length > 0 ? invoice.purchasedItems.join(", ") : "Purchase invoice";

                      return (
                        <li className="customer-modal-invoice" key={invoice.id}>
                          <div className="customer-modal-invoice-main">
                            <span className="customer-modal-invoice-date">
                              {dateParts.monthDay} {dateParts.year}
                            </span>
                            <p className="customer-modal-invoice-items">{itemsLabel}</p>
                          </div>
                          <div className="customer-modal-invoice-meta">
                            <span className={`customer-directory-status-pill ${getHistoryStatusClass(invoice)}`}>
                              {invoice.statusLabel ?? "Delivered"}
                            </span>
                            <strong
                              className={
                                invoice.totalAmount < 0
                                  ? "customer-modal-invoice-amount negative"
                                  : "customer-modal-invoice-amount"
                              }
                            >
                              {formatNpr(invoice.totalAmount)}
                            </strong>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {pageCount > 1 ? (
                  <div className="customer-modal-pagination">
                    <button type="button" onClick={() => onHistoryPageChange(Math.max(1, historyPage - 1))} disabled={historyPage === 1}>
                      Prev
                    </button>
                    <span>
                      Page {historyPage} of {pageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onHistoryPageChange(Math.min(pageCount, historyPage + 1))}
                      disabled={historyPage === pageCount}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </section>

              <aside className="customer-modal-panel customer-modal-panel-side">
                <div className="customer-modal-panel-head">
                  <h3>
                    <FiTruck size={18} aria-hidden />
                    Vehicles
                    <span className="customer-modal-count">{vehicles.length}</span>
                  </h3>
                </div>

                {vehicles.length === 0 ? (
                  <p className="customer-modal-empty">No vehicles on file.</p>
                ) : (
                  <ul className="customer-modal-vehicle-list">
                    {vehicles.map((vehicle, index) => (
                      <li className="customer-modal-vehicle" key={vehicle.id || `${vehicle.vehicleNumber}-${index}`}>
                        <strong>{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}</strong>
                        <span>
                          {vehicle.vehicleNumber || "No plate"}
                          {vehicle.year ? ` · ${vehicle.year}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {customerRecordId && !customerRecordId.startsWith("customer-") ? (
                  <p className="customer-modal-id" title="Customer ID">
                    ID: <code>{customerRecordId}</code>
                  </p>
                ) : null}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
