"use client";

import type { SearchCustomer } from "../lib/types";

type AdminCustomersViewProps = {
  adminListLoading: boolean;
  directoryCount: number;
  searchError: string | null;
  adminTableSearch: string;
  onAdminTableSearchChange: (value: string) => void;
  adminFilteredCustomers: SearchCustomer[];
  selectedCustomerId: string;
  detailModalOpen: boolean;
  onRefresh: () => void;
  onOpenCustomer: (customerId: string) => void;
};

export function AdminCustomersView({
  adminListLoading,
  directoryCount,
  searchError,
  adminTableSearch,
  onAdminTableSearchChange,
  adminFilteredCustomers,
  selectedCustomerId,
  detailModalOpen,
  onRefresh,
  onOpenCustomer,
}: AdminCustomersViewProps) {
  return (
    <>
      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">
            {adminListLoading
              ? "Loading customers…"
              : `${directoryCount} customer${directoryCount === 1 ? "" : "s"} in the database. Click a row to open the customer directory.`}
          </p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="form-button secondary" onClick={onRefresh} disabled={adminListLoading}>
            Refresh
          </button>
        </div>
      </header>

      {searchError ? <p className="purchase-invoice-status error">{searchError}</p> : null}

      <div className="form-card" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        <input
          className="form-input"
          placeholder="Search by name, email, phone, or customer ID"
          value={adminTableSearch}
          onChange={(event) => onAdminTableSearchChange(event.target.value)}
          style={{ maxWidth: "420px" }}
        />
      </div>

      <div className="table-container admin-table-scroll">
        <table className="data-table admin-customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {adminListLoading ? (
              <tr>
                <td colSpan={3} style={{ padding: "24px", textAlign: "center" }}>
                  Loading…
                </td>
              </tr>
            ) : adminFilteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "#6f5a45" }}>
                  {directoryCount === 0 ? "No customers in the database yet." : "No customers match your search."}
                </td>
              </tr>
            ) : (
              adminFilteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={
                    customer.id === selectedCustomerId && detailModalOpen
                      ? "admin-customers-table-row active"
                      : "admin-customers-table-row"
                  }
                  onClick={() => onOpenCustomer(customer.id)}
                >
                  <td data-label="Name" style={{ fontWeight: 600 }}>
                    {customer.fullName || "—"}
                  </td>
                  <td data-label="Email">{customer.email || "—"}</td>
                  <td data-label="Phone">{customer.phone || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
