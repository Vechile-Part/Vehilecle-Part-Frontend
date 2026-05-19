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

type VehicleMaintenanceReminder = {
  partName: string;
  priority: string;
  recommendation: string;
  suggestedActionBy: string;
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function CustomerProfilePage() {
  const [customerId, setCustomerId] = useState("");
  const [profile, setProfile] = useState({ id: "", fullName: "", phone: "", email: "" });
  const [vehicle, setVehicle] = useState({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [loading, setLoading] = useState(true);
  const [reminderVehicleId, setReminderVehicleId] = useState("");
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [maintenanceReminders, setMaintenanceReminders] = useState<VehicleMaintenanceReminder[]>([]);

  const resolvedCustomerId = useMemo(() => customerId || profile.id, [customerId, profile.id]);

  const setStatus = (text: string, tone: "info" | "error" = "info") => {
    setMessage(text);
    setMessageTone(tone);
  };

  const loadProfileAndVehicles = async (id: string) => {
    localStorage.setItem("customerId", id);
    setLoading(true);

    const [profileRes, vehiclesRes] = await Promise.all([
      apiFetch(`/api/customers/${id}/profile`),
      apiFetch(`/api/customers/${id}/vehicles`),
    ]);

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

    setLoading(false);
  };

  useEffect(() => {
    const id = readCustomerIdFromSession();
    if (!id) {
      setStatus("Please sign in to view your profile.", "error");
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
    setStatus(
      res.ok ? "Profile saved successfully." : extractApiError(await parseJsonSafe(res), "Profile update failed."),
      res.ok ? "info" : "error",
    );
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
      setStatus("Password updated successfully.");
    } else {
      setStatus(extractApiError(await parseJsonSafe(res), "Password change failed."), "error");
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
      setStatus("Vehicle added.");
      setVehicle({ id: "", vehicleNumber: "", make: "", model: "", year: 2020 });
      await loadProfileAndVehicles(resolvedCustomerId);
    } else {
      setStatus(extractApiError(await parseJsonSafe(res), "Could not add vehicle."), "error");
    }
  };

  const loadMaintenanceReminders = async (vehicleId: string) => {
    setReminderVehicleId(vehicleId);
    setRemindersLoading(true);
    setMaintenanceReminders([]);
    try {
      const res = await apiFetch(`/api/customers/vehicles/${vehicleId}/maintenance-reminders`);
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setMaintenanceReminders(
          data.map((row) => {
            const record = row as Record<string, unknown>;
            return {
              partName: String(record.partName ?? record.PartName ?? "Service item"),
              priority: String(record.priority ?? record.Priority ?? "Low"),
              recommendation: String(record.recommendation ?? record.Recommendation ?? ""),
              suggestedActionBy: String(record.suggestedActionBy ?? record.SuggestedActionBy ?? ""),
            };
          }),
        );
      } else {
        setStatus(extractApiError(data, "Could not load maintenance reminders."), "error");
      }
    } catch {
      setStatus("Network error while loading reminders.", "error");
    } finally {
      setRemindersLoading(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!resolvedCustomerId) return;
    const res = await apiFetch(`/api/customers/${resolvedCustomerId}/vehicles/${vehicleId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setStatus("Vehicle removed.");
      if (reminderVehicleId === vehicleId) {
        setReminderVehicleId("");
        setMaintenanceReminders([]);
      }
      await loadProfileAndVehicles(resolvedCustomerId);
    } else {
      setStatus(extractApiError(await parseJsonSafe(res), "Could not delete vehicle."), "error");
    }
  };

  if (loading) {
    return (
      <main className="layout-main customer-portal-page customer-profile-page">
        <div className="customer-profile-loading">Loading your profile…</div>
      </main>
    );
  }

  if (!resolvedCustomerId) {
    return (
      <main className="layout-main customer-portal-page customer-profile-page">
        <header className="customer-profile-header">
          <h1 className="customer-profile-title">My profile</h1>
        </header>
        <p className="customer-profile-status customer-profile-status--error" role="alert">
          {message || "No customer session found."}
        </p>
      </main>
    );
  }

  const displayName = profile.fullName.trim() || "Customer";

  return (
    <main className="layout-main customer-portal-page customer-profile-page">
      <header className="customer-profile-header">
        <h1 className="customer-profile-title">My profile</h1>
        <p className="customer-profile-subtitle">
          Update your contact details, password, and registered vehicles.
        </p>
      </header>

      {message ? (
        <p className={`customer-profile-status customer-profile-status--${messageTone}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="customer-portal-grid">
        <aside className="customer-portal-profile-card" aria-label="Account summary">
          <div className="customer-portal-portrait-ring">
            <div className="customer-portal-portrait" aria-hidden>
              {initialsFromName(displayName)}
            </div>
          </div>
          <p className="customer-portal-name">
            <span>{displayName}</span>
          </p>
          <span className="customer-portal-tier">Customer account</span>
          <div className="customer-portal-profile-metrics">
            <div>
              <span>Email</span>
              <strong>{profile.email || "—"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{profile.phone || "—"}</strong>
            </div>
            <div>
              <span>Vehicles</span>
              <strong>{vehicles.length}</strong>
            </div>
          </div>
        </aside>

        <div className="customer-profile-sections">
          <section className="customer-profile-panel" aria-labelledby="profile-contact-heading">
            <div className="customer-profile-panel-head">
              <h2 id="profile-contact-heading">Contact details</h2>
              <p>Keep your name and contact information up to date.</p>
            </div>
            <div className="customer-profile-fields">
              <div className="customer-profile-field customer-profile-field--full">
                <label htmlFor="profile-full-name">Full name</label>
                <input
                  id="profile-full-name"
                  className="form-input"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  autoComplete="name"
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  className="form-input"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="customer-profile-actions">
              <button type="button" className="form-button" onClick={() => void updateProfile()}>
                Save changes
              </button>
            </div>
          </section>

          <section className="customer-profile-panel" aria-labelledby="profile-password-heading">
            <div className="customer-profile-panel-head">
              <h2 id="profile-password-heading">Password</h2>
              <p>Use at least 8 characters for your new password.</p>
            </div>
            <div className="customer-profile-fields">
              <div className="customer-profile-field">
                <label htmlFor="profile-current-password">Current password</label>
                <input
                  id="profile-current-password"
                  className="form-input"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="profile-new-password">New password</label>
                <input
                  id="profile-new-password"
                  className="form-input"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="customer-profile-actions">
              <button type="button" className="form-button secondary" onClick={() => void changePassword()}>
                Update password
              </button>
            </div>
          </section>

          <section className="customer-profile-panel" aria-labelledby="profile-vehicles-heading">
            <div className="customer-profile-panel-head">
              <h2 id="profile-vehicles-heading">My vehicles</h2>
              <p>Vehicles linked to your account for service and parts.</p>
            </div>
            {vehicles.length === 0 ? (
              <p className="customer-profile-empty">No vehicles registered yet. Add one below.</p>
            ) : (
              <ul className="customer-profile-vehicle-list">
                {vehicles.map((v) => (
                  <li
                    key={v.id}
                    className={`customer-profile-vehicle-card${reminderVehicleId === v.id ? " customer-profile-vehicle-card--active" : ""}`}
                  >
                    <div>
                      <p className="customer-profile-vehicle-title">{v.vehicleNumber}</p>
                      <p className="customer-profile-vehicle-meta">
                        {v.make} {v.model} · {v.year}
                      </p>
                    </div>
                    <div className="customer-profile-vehicle-actions">
                      <button
                        type="button"
                        className="form-button secondary"
                        onClick={() => void loadMaintenanceReminders(v.id)}
                      >
                        Reminders
                      </button>
                      <button
                        type="button"
                        className="form-button secondary"
                        onClick={() => void deleteVehicle(v.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="customer-profile-panel" aria-labelledby="profile-reminders-heading">
            <div className="customer-profile-panel-head">
              <h2 id="profile-reminders-heading">Maintenance reminders</h2>
              <p>Suggestions based on your purchase history and vehicle year.</p>
            </div>
            {remindersLoading ? (
              <p className="customer-profile-empty">Loading reminders…</p>
            ) : maintenanceReminders.length === 0 ? (
              <p className="customer-profile-empty">
                {reminderVehicleId
                  ? "No reminders for this vehicle right now."
                  : "Select Reminders on a vehicle to see suggestions."}
              </p>
            ) : (
              <ul className="customer-profile-reminder-list">
                {maintenanceReminders.map((reminder) => (
                  <li
                    key={`${reminder.partName}-${reminder.suggestedActionBy}-${reminder.recommendation}`}
                    className="customer-profile-reminder-card"
                  >
                    <h3>{reminder.partName}</h3>
                    <p className="customer-profile-reminder-meta">
                      {reminder.priority}
                      {reminder.suggestedActionBy ? ` · ${reminder.suggestedActionBy}` : ""}
                    </p>
                    <p className="customer-profile-reminder-text">{reminder.recommendation}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="customer-profile-panel" aria-labelledby="profile-add-vehicle-heading">
            <div className="customer-profile-panel-head">
              <h2 id="profile-add-vehicle-heading">Add vehicle</h2>
              <p>Register another vehicle to your account.</p>
            </div>
            <div className="customer-profile-fields">
              <div className="customer-profile-field">
                <label htmlFor="vehicle-number">Plate / number</label>
                <input
                  id="vehicle-number"
                  className="form-input"
                  value={vehicle.vehicleNumber}
                  onChange={(e) => setVehicle({ ...vehicle, vehicleNumber: e.target.value })}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="vehicle-make">Make</label>
                <input
                  id="vehicle-make"
                  className="form-input"
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="vehicle-model">Model</label>
                <input
                  id="vehicle-model"
                  className="form-input"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                />
              </div>
              <div className="customer-profile-field">
                <label htmlFor="vehicle-year">Year</label>
                <input
                  id="vehicle-year"
                  className="form-input"
                  type="number"
                  min={1980}
                  max={2100}
                  value={vehicle.year}
                  onChange={(e) => setVehicle({ ...vehicle, year: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="customer-profile-actions">
              <button type="button" className="form-button" onClick={() => void addVehicle()}>
                Add vehicle
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
