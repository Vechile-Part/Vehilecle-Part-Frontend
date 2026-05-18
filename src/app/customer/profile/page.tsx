"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  authHeaders,
  extractApiError,
  parseJsonSafe,
  readCustomerIdFromSession,
} from "@/lib/http";

type VehicleItem = { id: string; vehicleNumber: string; make: string; model: string; year: number };

type VehicleHealthInsight = {
  partName: string;
  riskLevel: number;
  recommendation: string;
  daysRemaining: string;
};

export default function CustomerProfilePage() {
  const [customerId, setCustomerId] = useState("");
  const [profile, setProfile] = useState({ id: "", fullName: "", phone: "", email: "" });
  const [vehicle, setVehicle] = useState({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [healthVehicleId, setHealthVehicleId] = useState("");
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthInsights, setHealthInsights] = useState<VehicleHealthInsight[]>([]);

  const resolvedCustomerId = useMemo(() => customerId || profile.id, [customerId, profile.id]);

  const loadProfileAndVehicles = async (id: string) => {
    localStorage.setItem("customerId", id);
    const profileRes = await apiFetch(`/api/customers/${id}/profile`);
    if (profileRes.ok) {
      const data = await parseJsonSafe(profileRes);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const record = data as Record<string, unknown>;
        setProfile({
          id: String(record.id ?? record.customerId ?? ""),
          fullName: String(record.fullName ?? record.name ?? ""),
          phone: String(record.phone ?? record.phoneNumber ?? ""),
          email: String(record.email ?? record.emailAddress ?? ""),
        });
      }
    }

    const vehiclesRes = await apiFetch(`/api/customers/${id}/vehicles`);
    if (vehiclesRes.ok) {
      const vehiclesData = await parseJsonSafe(vehiclesRes);
      if (Array.isArray(vehiclesData)) {
        setVehicles(
          vehiclesData.map((item) => ({
            id: String((item as Record<string, unknown>).id ?? ""),
            vehicleNumber: String((item as Record<string, unknown>).vehicleNumber ?? ""),
            make: String((item as Record<string, unknown>).make ?? ""),
            model: String((item as Record<string, unknown>).model ?? ""),
            year: Number((item as Record<string, unknown>).year ?? 0),
          })),
        );
      }
    }

    setMessage("Profile loaded");
    setLoading(false);
  };

  useEffect(() => {
    const id = readCustomerIdFromSession();
    if (!id) {
      setMessage("No logged-in customer found. Please login first.");
      setLoading(false);
      return;
    }
    setCustomerId(id);
    void loadProfileAndVehicles(id);
  }, []);

  const updateProfile = async () => {
    if (!resolvedCustomerId) return;
    const res = await apiFetch(`/api/customers/${resolvedCustomerId}/profile`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify({
        id: resolvedCustomerId,
        fullName: profile.fullName,
        phone: profile.phone,
        email: profile.email,
      }),
    });
    setMessage(res.ok ? "Profile updated" : extractApiError(await parseJsonSafe(res), "Profile update failed"));
  };

  const changePassword = async () => {
    if (!resolvedCustomerId) return;
    const res = await apiFetch(`/api/customers/${resolvedCustomerId}/password`, {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(passwordForm),
    });
    if (res.ok) {
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password changed");
    } else {
      setMessage(extractApiError(await parseJsonSafe(res), "Password change failed"));
    }
  };

  const addVehicle = async () => {
    if (!resolvedCustomerId) return;
    const payload = {
      id: vehicle.id || crypto.randomUUID(),
      vehicleNumber: vehicle.vehicleNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    };
    const res = await apiFetch(`/api/customers/${resolvedCustomerId}/vehicles`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage("Vehicle added");
      setVehicle({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
      await loadProfileAndVehicles(resolvedCustomerId);
    } else {
      setMessage(extractApiError(await parseJsonSafe(res), "Vehicle add failed"));
    }
  };

  const loadVehicleHealth = async (vehicleId: string) => {
    setHealthVehicleId(vehicleId);
    setHealthLoading(true);
    setHealthInsights([]);
    try {
      const res = await apiFetch(`/api/customers/vehicles/${vehicleId}/ai-health`);
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setHealthInsights(
          data.map((row) => {
            const record = row as Record<string, unknown>;
            return {
              partName: String(record.partName ?? record.PartName ?? "Part"),
              riskLevel: Number(record.riskLevel ?? record.RiskLevel ?? 0),
              recommendation: String(record.recommendation ?? record.Recommendation ?? ""),
              daysRemaining: String(record.daysRemaining ?? record.DaysRemaining ?? ""),
            };
          }),
        );
      } else {
        setMessage(extractApiError(data, "Could not load vehicle health insights."));
      }
    } catch {
      setMessage("Network error while loading vehicle health.");
    } finally {
      setHealthLoading(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!resolvedCustomerId) return;
    const res = await apiFetch(`/api/customers/${resolvedCustomerId}/vehicles/${vehicleId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setMessage("Vehicle deleted");
      await loadProfileAndVehicles(resolvedCustomerId);
    } else {
      setMessage(extractApiError(await parseJsonSafe(res), "Vehicle delete failed"));
    }
  };

  if (loading) {
    return (
      <main className="form-page">
        <section className="form-card">
          <p className="form-message">Loading profile...</p>
        </section>
      </main>
    );
  }

  if (!resolvedCustomerId) {
    return (
      <main className="form-page">
        <section className="form-card">
          <p className="form-message">{message || "No customer session found."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="form-page">
      <section className="form-card">
        <h1 className="form-title">Customer Profile & Vehicles</h1>
        <p className="form-subtitle">Customer ID: {resolvedCustomerId}</p>
        <div className="form-grid">
          <input
            className="form-input"
            placeholder="Full Name"
            value={profile.fullName}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
          />
          <input
            className="form-input"
            placeholder="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <input
            className="form-input"
            placeholder="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <button type="button" className="form-button" onClick={() => void updateProfile()}>
            Update Profile
          </button>
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
          <button type="button" className="form-button secondary" onClick={() => void changePassword()}>
            Change Password
          </button>
        </div>

        <h2 className="form-section-title">Existing Vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="form-message">No vehicles found.</p>
        ) : (
          <div className="form-grid">
            {vehicles.map((v) => (
              <div key={v.id} className="result-pre">
                <p>
                  <strong>{v.vehicleNumber}</strong> - {v.make} {v.model} ({v.year})
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                  <button type="button" className="form-button secondary" onClick={() => void loadVehicleHealth(v.id)}>
                    View health insights
                  </button>
                  <button type="button" className="form-button secondary" onClick={() => void deleteVehicle(v.id)}>
                    Delete Vehicle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="form-section-title">Vehicle health insights</h2>
        {healthLoading ? (
          <p className="form-message">Loading health analysis…</p>
        ) : healthInsights.length === 0 ? (
          <p className="form-message">
            {healthVehicleId
              ? "No insights returned for this vehicle."
              : "Select a vehicle above to view maintenance recommendations."}
          </p>
        ) : (
          <div className="form-grid">
            {healthInsights.map((insight) => (
              <article key={insight.partName} className="result-pre">
                <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{insight.partName}</p>
                <p style={{ margin: "0 0 4px", fontSize: "13px" }}>
                  Risk: {Math.round(insight.riskLevel * 100)}% · Due in {insight.daysRemaining}
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#5a4733" }}>{insight.recommendation}</p>
              </article>
            ))}
          </div>
        )}

        <h2 className="form-section-title">Add Vehicle</h2>
        <div className="form-grid">
          <input
            className="form-input"
            placeholder="Vehicle Number"
            value={vehicle.vehicleNumber}
            onChange={(e) => setVehicle({ ...vehicle, vehicleNumber: e.target.value })}
          />
          <input
            className="form-input"
            placeholder="Make"
            value={vehicle.make}
            onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
          />
          <input
            className="form-input"
            placeholder="Model"
            value={vehicle.model}
            onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
          />
          <input
            className="form-input"
            type="number"
            placeholder="Year"
            value={vehicle.year}
            onChange={(e) => setVehicle({ ...vehicle, year: Number(e.target.value) })}
          />
          <button type="button" className="form-button" onClick={() => void addVehicle()}>
            Add Vehicle
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
