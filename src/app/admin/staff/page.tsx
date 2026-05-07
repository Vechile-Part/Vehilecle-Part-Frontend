"use client";
import { useState, useEffect } from "react";

const API = "http://localhost:5019";

export default function AdminStaffPage() {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [staff, setStaff] = useState({ fullName: "", email: "", phone: "", password: "" });
    const [role, setRole] = useState({ userId: "", newRole: 2 });
    const [msg, setMsg] = useState("");
    
    
    useEffect(() => { loadStaff(); }, []);

    const loadStaff = async () => {
        const res = await fetch(`${API}/api/admin/staff`);
        if (res.ok) {
            const data = await res.json();
            setStaffList(data);
        }
    };

    const register = async () => {
        const res = await fetch(`${API}/api/admin/staff/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(staff),
        });
        if (res.ok) {
            setMsg("Staff member registered successfully!");
            setStaff({ fullName: "", email: "", phone: "", password: "" }); 
            loadStaff(); 
        }
    };

    const deleteStaff = async (id: string) => {
        const res = await fetch(`${API}/api/admin/staff/${id}`, { method: "DELETE" });
        if (res.ok) {
            setMsg("Staff member deleted.");
            loadStaff(); 
        }
    };

    const updateRole = async () => {
        const res = await fetch(`${API}/api/admin/staff/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: role.userId, newRole: Number(role.newRole) }),
        });
        if (res.ok) {
            setMsg("Role updated successfully!");
            loadStaff(); 
        }
    };

    return (
        <main className="form-page">
            <section className="form-card">
                <h1 className="form-title"> Staff Management</h1>

                {/* Registration Form */}
                <div className="form-grid">
                    <input className="form-input" placeholder="Full Name" value={staff.fullName} onChange={(e) => setStaff({ ...staff, fullName: e.target.value })} />
                    <input className="form-input" placeholder="Email" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
                    <input className="form-input" placeholder="Phone" value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} />
                    <input className="form-input" type="password" placeholder="Set Initial Password" value={staff.password} onChange={(e) => setStaff({ ...staff, password: e.target.value })} />
                    <button className="form-button" onClick={register}>Register Staff</button>
                </div>
                {msg && <p className="form-message">{msg}</p>}

                <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #ddd" }} />

                {/* Staff List Table */}
                <h2 className="form-section-title">Current Staff & Admins</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                    <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #4a3728" }}>
                        <th style={{ padding: "10px" }}>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {staffList.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "10px" }}>{s.fullName}</td>
                            <td>{s.email}</td>
                            <td>{s.role === 1 ? "Admin" : "Staff"}</td>
                            <td>
                                <button
                                    onClick={() => deleteStaff(s.id)}
                                    style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <hr style={{ margin: "30px 0", border: "0", borderTop: "1px solid #ddd" }} />

                {/* Role Update Section */}
                <h2 className="form-subtitle">Update Staff Role</h2>
                <div className="form-grid">
                    <input className="form-input" placeholder="User ID (from table above)" value={role.userId} onChange={(e) => setRole({ ...role, userId: e.target.value })} />
                    <input className="form-input" type="number" placeholder="Role (1=Admin, 2=Staff)" value={role.newRole} onChange={(e) => setRole({ ...role, newRole: Number(e.target.value) })} />
                    <button className="form-button" onClick={updateRole}>Update Role</button>
                </div>
            </section>
        </main>
    );
}
