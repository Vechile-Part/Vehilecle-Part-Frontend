"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

type CustomerRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

const mapCustomerRow = (row: unknown): CustomerRow | null => {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  return {
    id,
    fullName: String(record.fullName ?? record.FullName ?? ""),
    email: String(record.email ?? record.Email ?? ""),
    phone: String(record.phone ?? record.Phone ?? ""),
  };
};

export default function AdminCustomerAccountsPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiFetch("/api/admin/customers");
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setCustomers(
          data.map(mapCustomerRow).filter((row): row is CustomerRow => row !== null),
        );
      } else {
        setCustomers([]);
        setStatus({ tone: "error", text: extractApiError(data, "Could not load customers.") });
      }
    } catch {
      setCustomers([]);
      setStatus({ tone: "error", text: "Network error while loading customers." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term),
    );
  }, [customers, search]);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-subtitle">
            {loading
              ? "Loading customers…"
              : `${customers.length} customer${customers.length === 1 ? "" : "s"} in the database.`}
          </p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="form-button secondary" onClick={() => void loadCustomers()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {status && <p className={`purchase-invoice-status ${status.tone}`}>{status.text}</p>}

      <div className="form-card" style={{ maxWidth: "none", marginBottom: "1rem" }}>
        <input
          className="form-input"
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "420px" }}
        />
      </div>

      <div className="table-container admin-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: "24px", textAlign: "center" }}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "#6f5a45" }}>
                  {customers.length === 0 ? "No customers in the database yet." : "No customers match your search."}
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer.id}>
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
    </div>
  );
}
