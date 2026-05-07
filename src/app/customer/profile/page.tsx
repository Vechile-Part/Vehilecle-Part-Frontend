"use client";
import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5020";
const parseJsonSafe = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
type VehicleItem = { id: string; vehicleNumber: string; make: string; model: string; year: number };

const readCustomerIdFromSession = () => {
  const fromStorage = localStorage.getItem("customerId") || localStorage.getItem("userId");
  if (fromStorage) return fromStorage;

  const token = localStorage.getItem("authToken");
  if (!token) return "";

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return "";
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const payload = JSON.parse(json) as Record<string, string>;
    return payload.customerId || payload.sub || payload.nameid || payload.userId || "";
  } catch {
    return "";
  }
};

export default function CustomerProfilePage() {
  const [customerId, setCustomerId] = useState("");
  const [profile, setProfile] = useState({ id: "", fullName: "", phone: "", email: "" });
  const [vehicle, setVehicle] = useState({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const resolvedCustomerId = useMemo(() => customerId || profile.id, [customerId, profile.id]);

  const getProfile = async () => {
    if (!resolvedCustomerId) return;
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/profile`);
    if (!res.ok) return setMessage("Failed to load profile");
    const data = await parseJsonSafe(res);
    if (!data) return setMessage("Profile response was empty or invalid.");
    setProfile(data);
    if (data.id) {
      setCustomerId(data.id);
      localStorage.setItem("customerId", data.id);
    }
  };

  const getVehicles = async () => {
    if (!resolvedCustomerId) return;
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/vehicles`);
    if (!res.ok) return;
    const data = await parseJsonSafe(res);
    setVehicles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const id = readCustomerIdFromSession();
    if (!id) {
      setLoading(false);
      setMessage("No logged-in customer found. Please login first.");
      return;
    }
    setCustomerId(id);
    localStorage.setItem("customerId", id);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!resolvedCustomerId) return;
    const load = async () => {
      await getProfile();
      await getVehicles();
      setMessage("Profile loaded");
    };
    void load();
  }, [resolvedCustomerId]);

  const updateProfile = async () => {
    if (!resolvedCustomerId) return;
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setMessage(res.ok ? "Profile updated" : "Profile update failed");
  };

  const changePassword = async () => {
    if (!resolvedCustomerId) return;
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordForm),
    });
    if (res.ok) {
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password changed");
    } else {
      setMessage("Password change failed");
    }
  };

  const addVehicle = async () => {
    if (!resolvedCustomerId) return;
    const payload = { ...vehicle, id: vehicle.id || crypto.randomUUID() };
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage("Vehicle added");
      setVehicle({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
      await getVehicles();
    } else {
      setMessage("Vehicle add failed");
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!resolvedCustomerId) return;
    const res = await fetch(`${API}/api/customers/${resolvedCustomerId}/vehicles/${vehicleId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessage("Vehicle deleted");
      await getVehicles();
    } else {
      setMessage("Vehicle delete failed");
    }
  };

  if (loading) {
    return (
      <main className="form-page">
        <section className="form-card"><p className="form-message">Loading profile...</p></section>
      </main>
    );
  }

  if (!resolvedCustomerId) {
    return (
      <main className="form-page">
        <section className="form-card"><p className="form-message">{message || "No customer session found."}</p></section>
      </main>
    );
  }

  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Customer Profile & Vehicles</h1>
        <p className="form-subtitle">Customer ID: {resolvedCustomerId}</p>
        <div className="form-grid">
          <input className="form-input" placeholder="Full Name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
          <input className="form-input" placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <input className="form-input" placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <button className="form-button" onClick={updateProfile}>Update Profile</button>
        </div>

        <h2 className="form-section-title">Change Password</h2>
        <div className="form-grid">
          <input
            className="form-input"
            type="password"
            placeholder="Current Password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          />
          <input
            className="form-input"
            type="password"
            placeholder="New Password (min 8 chars)"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          />
          <button className="form-button secondary" onClick={changePassword}>Change Password</button>
        </div>

        <h2 className="form-section-title">Existing Vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="form-message">No vehicles found.</p>
        ) : (
          <div className="form-grid">
            {vehicles.map((v) => (
              <div key={v.id} className="result-pre">
                <p><strong>{v.vehicleNumber}</strong> - {v.make} {v.model} ({v.year})</p>
                <button className="form-button secondary" onClick={() => deleteVehicle(v.id)}>Delete Vehicle</button>
              </div>
            ))}
          </div>
        )}

        <h2 className="form-section-title">Add Vehicle</h2>
        <div className="form-grid">
          <input className="form-input" placeholder="Vehicle Number" value={vehicle.vehicleNumber} onChange={(e) => setVehicle({ ...vehicle, vehicleNumber: e.target.value })} />
          <input className="form-input" placeholder="Make" value={vehicle.make} onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })} />
          <input className="form-input" placeholder="Model" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
          <input className="form-input" type="number" placeholder="Year" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: Number(e.target.value) })} />
          <button className="form-button" onClick={addVehicle}>Add Vehicle</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
