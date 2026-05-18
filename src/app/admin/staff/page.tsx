"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

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
  password: string;
};

const displayName = (s: StaffMember) =>
  s.fullName?.trim() || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "—";

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [formData, setFormData] = useState<StaffForm>({ fullName: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiFetch("/api/admin/staff");
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setStaffList(data as StaffMember[]);
      } else {
        setStaffList([]);
        setStatus({ tone: "error", text: extractApiError(data, "Could not load staff.") });
      }
    } catch {
      setStaffList([]);
      setStatus({ tone: "error", text: "Network error while loading staff." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const handleSave = async () => {
    const finalPhone = formData.phone.trim() || "0000000000";
    const finalPassword = formData.password.trim() || "Password123!";

    const payload = editMode
      ? { userId: currentId, fullName: formData.fullName, email: formData.email, phone: finalPhone }
      : { fullName: formData.fullName, email: formData.email, phone: finalPhone, password: finalPassword };

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
        text: editMode ? "Staff updated." : `Staff registered. Temporary password: ${finalPassword}`,
      });
      setShowModal(false);
      await loadStaff();
    } catch {
      setStatus({ tone: "error", text: "Network error." });
    }
  };

  const handleRemoveFromStaff = async (id: string, name: string) => {
    if (
      !confirm(
        `Remove "${name}" from staff?\n\nThey will stay in the system as a customer (no staff login).`,
      )
    ) {
      return;
    }
    try {
      const res = await apiFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({ tone: "error", text: extractApiError(data, "Could not remove from staff.") });
        return;
      }
      setStatus({ tone: "success", text: "Staff access removed. User is now a customer." });
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
              <h2 style={{ margin: 0 }}>{editMode ? "Edit staff" : "Add staff"}</h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <input className="form-input" placeholder="Full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              <input className="form-input" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <input className="form-input" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              {!editMode && (
                <input
                  type="password"
                  className="form-input"
                  placeholder="Password (optional)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              )}
              <button type="button" className="form-button" onClick={() => void handleSave()}>
                {editMode ? "Save changes" : "Register staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Staff management</h1>
          <p className="admin-page-subtitle">Add staff accounts or remove access (user becomes a customer).</p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="form-button"
            onClick={() => {
              setEditMode(false);
              setCurrentId("");
              setFormData({ fullName: "", email: "", phone: "", password: "" });
              setShowModal(true);
            }}
          >
            + Add staff
          </button>
        </div>
      </header>

      {status && <div className={`purchase-invoice-status ${status.tone}`}>{status.text}</div>}

      <div className="form-card inventory-container" style={{ maxWidth: "none", border: "1px solid #eadfcd", borderRadius: "12px", padding: 0, overflow: "hidden" }}>
        <div className="inventory-table-scroll">
          <table className="inventory-table">
            <thead style={{ background: "#f9f6f0" }}>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                    Loading…
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                    No staff accounts.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Name" style={{ fontWeight: 600 }}>
                      {displayName(s)}
                    </td>
                    <td data-label="Role">
                      <span className="role-badge">{Number(s.role) === 1 ? "Admin" : "Staff"}</span>
                    </td>
                    <td data-label="Email">{s.email}</td>
                    <td data-label="Phone">{s.phone || "—"}</td>
                    <td data-label="Actions">
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: "#3d2817" }}
                        onClick={() => {
                          setCurrentId(s.id ?? "");
                          setFormData({
                            fullName: displayName(s) === "—" ? "" : displayName(s),
                            email: s.email ?? "",
                            phone: s.phone || "",
                            password: "",
                          });
                          setEditMode(true);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: "#8f3d2b" }}
                        onClick={() => void handleRemoveFromStaff(s.id, displayName(s))}
                      >
                        Remove from staff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
