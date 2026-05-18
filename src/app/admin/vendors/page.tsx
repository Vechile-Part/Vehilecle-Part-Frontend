"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { authHeaders, parseJsonSafe } from "@/lib/http";

const API = API_BASE_URL;

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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [message, setMessage] = useState("");

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/api/vendors`, { headers: authHeaders() });
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setVendors(data.map((item) => normalizeVendor(item as Record<string, unknown>)));
      } else {
        setMessage("Could not load vendors.");
      }
    } catch {
      setMessage("Network error while loading vendors.");
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
      alert("Name, contact person, and email are required.");
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
      const res = await fetch(
        editMode ? `${API}/api/vendors/${currentId}` : `${API}/api/vendors`,
        {
          method: editMode ? "PUT" : "POST",
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        setShowModal(false);
        await loadVendors();
      } else {
        alert("Could not save vendor. Check the details and try again.");
      }
    } catch {
      alert("Network error while saving vendor.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor? Purchase history may still reference them.")) return;
    try {
      const res = await fetch(`${API}/api/vendors/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) await loadVendors();
      else alert("Delete failed.");
    } catch {
      alert("Network error during delete.");
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
        <button type="button" className="form-button" onClick={openCreate} style={{ width: "auto", padding: "12px 28px" }}>
          + Add vendor
        </button>
      </header>

      <MotionlessSearch search={search} setSearch={setSearch} />

      {message && <p className="form-message">{message}</p>}

      <MotionlessTable
        loading={loading}
        vendors={filteredVendors}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
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
    <div className="vendor-table-card">
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
                  <div className="vendor-actions">
                    <button type="button" className="edit" onClick={() => onEdit(vendor)}>
                      Edit
                    </button>
                    <button type="button" className="delete" onClick={() => onDelete(vendor.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
