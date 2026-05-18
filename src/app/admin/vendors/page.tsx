"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import "../../../styles/pages/HistoryPage.css";

type Vendor = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  companyRegistrationNumber: string;
  isActive: boolean;
};

type VendorForm = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  companyRegistrationNumber: string;
  isActive: boolean;
};

const emptyForm: VendorForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  companyRegistrationNumber: "",
  isActive: true,
};

const normalizeVendor = (record: Record<string, unknown>): Vendor => ({
  id: String(record.id ?? record.Id ?? ""),
  name: String(record.name ?? record.Name ?? ""),
  contactPerson: String(record.contactPerson ?? record.ContactPerson ?? ""),
  email: String(record.email ?? record.Email ?? ""),
  phone: String(record.phone ?? record.Phone ?? ""),
  address: String(record.address ?? record.Address ?? ""),
  companyRegistrationNumber: String(
    record.companyRegistrationNumber ?? record.CompanyRegistrationNumber ?? "",
  ),
  isActive: Boolean(record.isActive ?? record.IsActive ?? true),
});

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const ITEMS_PER_PAGE = 10;
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/vendors");
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setVendors(data.map((item) => normalizeVendor(item as Record<string, unknown>)));
      } else {
        setMessage({ tone: "error", text: "Could not load vendors." });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error while loading vendors." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const filteredVendors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(term) ||
        vendor.contactPerson.toLowerCase().includes(term) ||
        vendor.email.toLowerCase().includes(term) ||
        vendor.phone.includes(term),
    );
  }, [search, vendors]);

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / ITEMS_PER_PAGE));
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVendors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  useEffect(() => {
    // reset to first page when filter changes
    setCurrentPage(1);
  }, [search, vendors.length]);

  const openCreate = () => {
    setEditMode(false);
    setCurrentId("");
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditMode(true);
    setCurrentId(vendor.id);
    setForm({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      companyRegistrationNumber: vendor.companyRegistrationNumber,
      isActive: vendor.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.contactPerson.trim() || !form.email.trim()) {
      setMessage({ tone: "error", text: "Name, contact person, and email are required." });
      return;
    }

    const payload = editMode
      ? {
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          companyRegistrationNumber: form.companyRegistrationNumber.trim() || null,
          isActive: form.isActive,
        }
      : {
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          companyRegistrationNumber: form.companyRegistrationNumber.trim() || null,
        };

    try {
      const res = editMode
        ? await apiFetch(`/api/vendors/${currentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await parseJsonSafe(res);

      if (res.ok) {
        setShowModal(false);
        setMessage({ tone: "success", text: editMode ? "Vendor updated." : "Vendor added." });
        await loadVendors();
      } else {
        setMessage({ tone: "error", text: extractApiError(data, "Could not save vendor.") });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error while saving vendor." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor? Purchase history may still reference them.")) return;
    try {
      const res = await apiFetch(`/api/vendors/${id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (res.ok) {
        setMessage({ tone: "success", text: "Vendor deleted." });
        await loadVendors();
      } else {
        setMessage({ tone: "error", text: extractApiError(data, "Delete failed.") });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error during delete." });
    }
  };

  return (
    <main className="vendor-page">
      {showModal && (
        <MotionlessModal
          title={editMode ? "Edit vendor" : "Add vendor"}
          onClose={() => setShowModal(false)}
        >
          <MotionlessForm
            form={form}
            setForm={setForm}
            editMode={editMode}
            onSave={handleSave}
          />
        </MotionlessModal>
      )}

      <header className="vendor-page-header">
        <MotionlessHeader />
        <button
          type="button"
          className="form-button"
          onClick={openCreate}
          style={{ width: "auto", padding: "12px 28px", margin: "12px 0" }}
        >
          + Add vendor
        </button>
      </header>

      <MotionlessSearch search={search} setSearch={setSearch} />

      {message && <p className={`purchase-invoice-status ${message.tone}`}>{message.text}</p>}

      <MotionlessTable
        loading={loading}
        vendors={paginatedVendors}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <PaginationControls currentPage={currentPage} totalItems={filteredVendors.length} onPageChange={setCurrentPage} />
    </main>
  );
}

function MotionlessHeader() {
  return (
    <div>
      <h1 className="vendor-page-title">Vendor management</h1>
      <p className="vendor-page-description">
        Create and maintain supplier records used when recording purchase invoices and incoming stock.
      </p>
    </div>
  );
}

function MotionlessSearch({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <div className="form-card" style={{ maxWidth: "none", padding: "20px", border: "1px solid #eadfcd" }}>
      <input
        className="form-input"
        placeholder="Search vendors by name, contact, email, or phone..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>
  );
}

function MotionlessTable({
  loading,
  vendors,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="form-card inventory-container vendor-table-card" style={{ maxWidth: "none", border: "1px solid #eadfcd", borderRadius: "12px", padding: 0, overflow: "hidden" }}>
      <div className="inventory-table-scroll">
        <table className="inventory-table">
        <thead style={{ background: "#f9f6f0" }}>
          <tr>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>VENDOR</th>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>CONTACT</th>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>EMAIL</th>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>PHONE</th>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>STATUS</th>
            <th style={{ padding: "16px 24px", textAlign: "left" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                Loading vendors...
              </td>
            </tr>
          ) : vendors.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                No vendors found.
              </td>
            </tr>
          ) : (
            vendors.map((vendor) => (
              <tr key={vendor.id} style={{ borderBottom: "1px solid #f0e4cf" }}>
                <td style={{ padding: "18px 24px", fontWeight: 600 }}>{vendor.name}</td>
                <td style={{ padding: "18px 24px" }}>{vendor.contactPerson}</td>
                <td style={{ padding: "18px 24px" }}>{vendor.email}</td>
                <td style={{ padding: "18px 24px" }}>{vendor.phone || "—"}</td>
                <td style={{ padding: "18px 24px" }}>
                  <span className={`vendor-status-pill ${vendor.isActive ? "active" : "inactive"}`}>
                    {vendor.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td style={{ padding: "18px 24px" }}>
                  <button type="button" className="action-btn" style={{ color: "#3d2817", marginRight: 8 }} onClick={() => onEdit(vendor)}>
                    Edit
                  </button>
                  <button type="button" className="action-btn" style={{ color: "#8f3d2b" }} onClick={() => onDelete(vendor.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function PaginationControls({ currentPage, totalItems, onPageChange }: {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }} className="pagination">
      <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
        ← Prev
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i + 1} className={`page-btn ${currentPage === i + 1 ? "active-page" : ""}`} onClick={() => onPageChange(i + 1)}>
          {i + 1}
        </button>
      ))}

      <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
        Next →
      </button>
    </div>
  );
}

function MotionlessModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <MotionlessModalInner title={title} onClose={onClose}>
      {children}
    </MotionlessModalInner>
  );
}

function MotionlessModalInner({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MotionlessForm({
  form,
  setForm,
  editMode,
  onSave,
}: {
  form: VendorForm;
  setForm: (form: VendorForm) => void;
  editMode: boolean;
  onSave: () => void;
}) {
  return (
    <div className="form-grid">
      <input
        className="form-input"
        placeholder="Vendor name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
      />
      <input
        className="form-input"
        placeholder="Contact person"
        value={form.contactPerson}
        onChange={(event) => setForm({ ...form, contactPerson: event.target.value })}
      />
      <input
        className="form-input"
        placeholder="Email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
      />
      <input
        className="form-input"
        placeholder="Phone"
        value={form.phone}
        onChange={(event) => setForm({ ...form, phone: event.target.value })}
      />
      <input
        className="form-input"
        placeholder="Address"
        value={form.address}
        onChange={(event) => setForm({ ...form, address: event.target.value })}
      />
      <input
        className="form-input"
        placeholder="Company registration (optional)"
        value={form.companyRegistrationNumber}
        onChange={(event) => setForm({ ...form, companyRegistrationNumber: event.target.value })}
      />
      {editMode && (
        <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#3d2817" }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Active vendor
        </label>
      )}
      <button type="button" className="form-button" onClick={onSave}>
        Save vendor
      </button>
    </div>
  );
}


