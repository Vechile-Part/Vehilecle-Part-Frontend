"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

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

type RoleForm = {
    userId: string;
    newRole: number;
};

const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
});

export default function AdminStaffPage() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState<string>("");

    const [formData, setFormData] = useState<StaffForm>({ fullName: "", email: "", phone: "", password: "" });
    const [roleForm, setRoleForm] = useState<RoleForm>({ userId: "", newRole: 2 });

    async function loadStaff() {
        try {
            const res = await fetch(`${API}/api/admin/staff`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setStaffList(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadStaff();
    }, []);

    const handleSave = async () => {
        const url = editMode ? `${API}/api/admin/staff/details` : `${API}/api/admin/staff/register`;
        const method = editMode ? "PUT" : "POST";

        const finalPhone = formData.phone.trim() || "0000000000";
        const finalPassword = formData.password.trim() || "Password123!";

        const payload = editMode
            ? { UserId: currentId, FullName: formData.fullName, Email: formData.email, Phone: finalPhone }
            : { FullName: formData.fullName, Email: formData.email, Phone: finalPhone, Password: finalPassword };

        try {
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                alert(editMode ? "Saved!" : `Registered! (Password: ${finalPassword})`);
                setShowModal(false);
                loadStaff();
            } else {
                const txt = await res.text();
                alert("Error: " + (txt || "Action failed."));
            }
        } catch (error) {
            console.error(error);
            alert("Network error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this staff member?")) return;
        try {
            const res = await fetch(`${API}/api/admin/staff/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (res.ok) {
                alert("Deleted successfully!");
                loadStaff();
            } else {
                alert("Delete failed.");
            }
        } catch (error) {
            console.error(error);
            alert("Network error during delete.");
        }
    };

    const handleUpdateRole = async () => {
        if (!roleForm.userId) return alert("Select staff member");
        try {
            const res = await fetch(`${API}/api/admin/staff/role`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ UserId: roleForm.userId, NewRole: Number(roleForm.newRole) }),
            });
            if (res.ok) {
                alert("Role updated!");
                loadStaff();
            }
        } catch (error) {
            console.error(error);
            alert("Error updating role");
        }
    };

    return (
        <main className="layout-main" style={{ padding: '40px' }}>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>{editMode ? "Edit Staff" : "Add Staff"}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="form-grid">
                            <input className="form-input" placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            <input className="form-input" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            <input className="form-input" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            {!editMode && (
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Password (Default: Password123!)"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            )}
                            <button className="form-button" onClick={handleSave}>Confirm Changes</button>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 className="form-title" style={{ fontSize: '32px', margin: 0 }}>Staff Management</h1>
                <button className="form-button" onClick={() => { setEditMode(false); setCurrentId(""); setFormData({fullName: "", email: "", phone: "", password: ""}); setShowModal(true); }} style={{ width: 'auto', padding: '12px 32px' }}>
                    + Add New Member
                </button>
            </header>

            <div className="form-card" style={{ maxWidth: 'none', border: '1px solid #eadfcd', borderRadius: '12px', padding: '0', overflow: 'hidden' }}>
                <table className="inventory-table">
                    <thead style={{ background: '#f9f6f0' }}>
                    <tr>
                        <th style={{ padding: '16px 24px', textAlign: 'left' }}>MEMBER NAME</th>
                        <th style={{ padding: '16px 24px', textAlign: 'left' }}>ROLE</th>
                        <th style={{ padding: '16px 24px', textAlign: 'left' }}>EMAIL</th>
                        <th style={{ padding: '16px 24px', textAlign: 'left' }}>PHONE</th>
                        <th style={{ padding: '16px 24px', textAlign: 'left' }}>ACTIONS</th>
                    </tr>
                    </thead>
                    <tbody>
                    {staffList.length === 0 ? (
                        <tr><td colSpan={5} style={{textAlign:'center', padding:'40px'}}>Loading staff list...</td></tr>
                    ) : staffList.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f0e4cf' }}>
                            <td style={{ padding: '20px 24px', fontWeight: '600' }}>{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                            <td><span className="role-badge">{Number(s.role) === 1 ? "ADMIN" : "STAFF"}</span></td>
                            <td>{s.email}</td>
                            <td>{s.phone || "---"}</td>
                            <td>
                                <button onClick={() => {
                                    setCurrentId(s.id ?? "");
                                    setFormData({
                                        fullName: s.fullName || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
                                        email: s.email ?? "",
                                        phone: s.phone || "",
                                        password: "",
                                    });
                                    setEditMode(true);
                                    setShowModal(true);
                                }} style={{ background: 'none', border: 'none', color: '#3d2817', cursor: 'pointer', fontWeight: '700', marginRight: '15px' }}>Edit</button>
                                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontWeight: '700' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="form-card" style={{ marginTop: '40px', maxWidth: 'none', border: '1px solid #eadfcd', padding: '40px', borderRadius: '12px' }}>
                <h2 style={{ fontSize: '24px', color: '#3d2817', marginBottom: '24px', marginTop: 0 }}>Quick Role Update</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <select className="form-input" value={roleForm.userId} onChange={(e) => setRoleForm({...roleForm, userId: e.target.value})}>
                        <option value="">Select Staff</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.fullName || `${s.firstName} ${s.lastName}`}</option>)}
                    </select>
                    <select className="form-input" value={roleForm.newRole} onChange={(e) => setRoleForm({...roleForm, newRole: Number(e.target.value)})}>
                        <option value={2}>Staff</option>
                        <option value={1}>Admin</option>
                    </select>
                    <button className="form-button" onClick={handleUpdateRole}>Update Role</button>
                </div>
            </div>
        </main>
    );
}
