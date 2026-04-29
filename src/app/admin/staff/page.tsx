"use client";
import { useState } from "react";

const API = "http://localhost:5020";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState({ fullName: "", email: "", phone: "" });
  const [role, setRole] = useState({ userId: "", newRole: 2 });
  const [msg, setMsg] = useState("");

  const register = async () => {
    const res = await fetch(`${API}/api/admin/staff/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff),
    });
    setMsg(res.ok ? "Staff registered" : "Staff register failed");
  };

  const updateRole = async () => {
    const res = await fetch(`${API}/api/admin/staff/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: role.userId, newRole: Number(role.newRole) }),
    });
    setMsg(res.ok ? "Role updated" : "Role update failed");
  };

  return (
    <main className="form-page">
      <section className="form-card narrow">
        <h1 className="form-title">Admin Staff Management</h1>
        <div className="form-grid">
          <input className="form-input" placeholder="Full Name" value={staff.fullName} onChange={(e) => setStaff({ ...staff, fullName: e.target.value })} />
          <input className="form-input" placeholder="Email" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
          <input className="form-input" placeholder="Phone" value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} />
          <button className="form-button" onClick={register}>Register Staff</button>
          <input className="form-input" placeholder="User ID (GUID)" value={role.userId} onChange={(e) => setRole({ ...role, userId: e.target.value })} />
          <input className="form-input" type="number" placeholder="Role enum value" value={role.newRole} onChange={(e) => setRole({ ...role, newRole: Number(e.target.value) })} />
          <button className="form-button" onClick={updateRole}>Update Role</button>
        </div>
        {msg && <p className="form-message">{msg}</p>}
      </section>
    </main>
  );
}
