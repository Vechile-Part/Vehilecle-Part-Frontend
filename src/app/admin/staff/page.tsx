"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import { getAuthToken } from "@/lib/session";

type StaffMember = {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: number | string;
};

type StaffForm = {
  fullName: string;
  email: string;
  phone: string;
};

const displayName = (s: StaffMember) =>
  s.fullName?.trim() || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "—";

const roleLabel = (role: number | string | undefined) => {
  if (role === "Admin" || role === 1 || role === "1") return "ADMIN";
  return "STAFF";
};

const roleNumber = (role: number | string | undefined) =>
  role === "Admin" || role === 1 || role === "1" ? 1 : 2;

function normalizeStaff(row: Record<string, unknown>): StaffMember | null {
  const id = String(row.id ?? row.Id ?? "").trim();
  if (!id) return null;
  return {
    id,
    fullName: String(row.fullName ?? row.FullName ?? ""),
    firstName: row.firstName != null ? String(row.firstName) : undefined,
    lastName: row.lastName != null ? String(row.lastName) : undefined,
    email: String(row.email ?? row.Email ?? ""),
    phone: String(row.phone ?? row.Phone ?? ""),
    role: roleNumber((row.role ?? row.Role) as number | string | undefined),
  };
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [formData, setFormData] = useState<StaffForm>({ fullName: "", email: "", phone: "" });
  const [roleForm, setRoleForm] = useState({ userId: "", newRole: 2 });
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const token = getAuthToken();
    if (!token) {
      setStaffList([]);
      setLoading(false);
      setStatus({ tone: "error", text: "Not signed in. Please log in as admin again." });
      return;
    }

    try {
      const res = await apiFetch("/api/admin/staff", { cache: "no-store" });
      const data = await parseJsonSafe(res);

      if (res.status === 401 || res.status === 403) {
        setStaffList([]);
        setStatus({ tone: "error", text: "Session expired or access denied. Please sign in as admin." });
        return;
      }

      if (res.ok && Array.isArray(data)) {
        const rows = data
          .map((row) => normalizeStaff(row as Record<string, unknown>))
          .filter((row): row is StaffMember => row !== null);
        setStaffList(rows);
        return;
      }

      setStaffList([]);
      setStatus({
        tone: "error",
        text: extractApiError(data, `Could not load staff (HTTP ${res.status}). Is the backend running on port 5020?`),
      });
    } catch {
      setStaffList([]);
      setStatus({
        tone: "error",
        text: "Cannot reach the API. Start the backend (port 5020) and refresh this page.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const openAddModal = () => {
    setEditMode(false);
    setCurrentId("");
    setFormData({ fullName: "", email: "", phone: "" });
    setShowModal(true);
  };

  const openEditModal = (s: StaffMember) => {
    setCurrentId(s.id);
    setFormData({
      fullName: displayName(s) === "—" ? "" : displayName(s),
      email: s.email ?? "",
      phone: s.phone || "",
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    const finalPhone = formData.phone.trim() || "0000000000";

    const payload = editMode
      ? { userId: currentId, fullName: formData.fullName, email: formData.email, phone: finalPhone }
      : { fullName: formData.fullName, email: formData.email, phone: finalPhone };

    try {
      const res = editMode
        ? await apiFetch("/api/admin/staff/details", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/admin/staff/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({ tone: "error", text: extractApiError(data, "Save failed.") });
        return;
      }

      setStatus({
        tone: "success",
        text: editMode
          ? "Staff updated successfully."
          : "Staff registered. A password setup link was sent to their email.",
      });
      setShowModal(false);
      await loadStaff();
    } catch {
      setStatus({ tone: "error", text: "Network error." });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({ tone: "error", text: extractApiError(data, "Delete failed.") });
        return;
      }
      if (roleForm.userId === id) {
        setRoleForm({ userId: "", newRole: 2 });
      }
      setStatus({ tone: "success", text: "Staff deleted successfully." });
      await loadStaff();
    } catch {
      setStatus({ tone: "error", text: "Network error." });
    }
  };

  const handleUpdateRole = async () => {
    if (!roleForm.userId) {
      setStatus({ tone: "error", text: "Select a staff member first." });
      return;
    }
    try {
      const res = await apiFetch("/api/admin/staff/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: roleForm.userId, newRole: Number(roleForm.newRole) }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({ tone: "error", text: extractApiError(data, "Role update failed.") });
        return;
      }
      setStatus({ tone: "success", text: "Role updated successfully." });
      await loadStaff();
    } catch {
      setStatus({ tone: "error", text: "Network error." });
    }
  };

  return (
    <main className="layout-main admin-page">
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container">
            <div className="modal-header">
              <h2 style={{ margin: 0, color: "#3d2817" }}>{editMode ? "Edit Staff" : "Add Staff"}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="form-grid">
              <input
                className="form-input"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              {!editMode && (
                <p style={{ margin: 0, color: "#5c4a3a", fontSize: "14px" }}>
                  An email with a secure link will be sent so they can set their own password.
                </p>
              )}
              <button type="button" className="form-button" onClick={() => void handleSave()}>
                {editMode ? "Confirm Changes" : "Register Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <h1 className="form-title" style={{ fontSize: "32px", margin: 0, color: "#3d2817" }}>
          Staff Management
        </h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="form-button secondary"
            onClick={() => void loadStaff()}
            style={{ width: "auto", padding: "12px 24px" }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" className="form-button" onClick={openAddModal} style={{ width: "auto", padding: "12px 32px" }}>
            + Add New Member
          </button>
        </div>
      </header>

      {status && <div className={`purchase-invoice-status ${status.tone}`}>{status.text}</div>}

      <div
        className="form-card inventory-container"
        style={{ maxWidth: "none", border: "1px solid #eadfcd", borderRadius: "12px", padding: 0, overflow: "hidden" }}
      >
        <div className="inventory-table-scroll">
          <table className="inventory-table">
            <thead style={{ background: "#f9f6f0" }}>
              <tr>
                <th style={{ padding: "16px 24px", textAlign: "left" }}>MEMBER NAME</th>
                <th style={{ padding: "16px 24px", textAlign: "left" }}>ROLE</th>
                <th style={{ padding: "16px 24px", textAlign: "left" }}>EMAIL</th>
                <th style={{ padding: "16px 24px", textAlign: "left" }}>PHONE</th>
                <th style={{ padding: "16px 24px", textAlign: "left" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                    Loading staff list…
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                    No staff members yet.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f0e4cf" }}>
                    <td style={{ padding: "20px 24px", fontWeight: 600 }}>{displayName(s)}</td>
                    <td style={{ padding: "20px 24px" }}>
                      <span className="role-badge">{roleLabel(s.role)}</span>
                    </td>
                    <td style={{ padding: "20px 24px" }}>{s.email || "—"}</td>
                    <td style={{ padding: "20px 24px" }}>{s.phone?.trim() || "—"}</td>
                    <td style={{ padding: "20px 24px" }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#3d2817",
                          cursor: "pointer",
                          fontWeight: 700,
                          marginRight: "15px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(s.id, displayName(s))}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#d9534f",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
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

      <div
        className="form-card"
        style={{
          marginTop: "40px",
          maxWidth: "none",
          border: "1px solid #eadfcd",
          padding: "40px",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ fontSize: "24px", color: "#3d2817", marginBottom: "24px", marginTop: 0 }}>Quick Role Update</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "480px" }}>
          <select
            className="form-input"
            value={roleForm.userId}
            onChange={(e) => setRoleForm({ ...roleForm, userId: e.target.value })}
          >
            <option value="">Select Staff</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {displayName(s)}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={roleForm.newRole}
            onChange={(e) => setRoleForm({ ...roleForm, newRole: Number(e.target.value) })}
          >
            <option value={2}>Staff</option>
            <option value={1}>Admin</option>
          </select>
          <button type="button" className="form-button" onClick={() => void handleUpdateRole()}>
            Update Role
          </button>
        </div>
      </div>
    </main>
  );
}
