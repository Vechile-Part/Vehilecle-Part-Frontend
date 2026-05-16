"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { FiUser, FiTruck } from "react-icons/fi"; 

const API = API_BASE_URL;

export default function StaffRegisterClient() {
    const [customer, setCustomer] = useState({ fullName: "", email: "", phone: "" });
    const [vehicle, setVehicle] = useState({ vehicleNumber: "", make: "", model: "", year: 2024 });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const submit = async () => {
        setLoading(true);
        setMessage("");
        try {
            const payload = {
                FullName: customer.fullName,
                Email: customer.email,
                Phone: customer.phone,
                VehicleNumber: vehicle.vehicleNumber,
                Make: vehicle.make,
                Model: vehicle.model,
                Year: vehicle.year
            };

            const res = await fetch(`${API}/api/staff/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setMessage("Customer and Vehicle Registered Successfully!");
                setCustomer({ fullName: "", email: "", phone: "" });
                setVehicle({ vehicleNumber: "", make: "", model: "", year: 2024 });
            } else {
                const errorTxt = await res.text();
                setMessage("Error: " + (errorTxt || "Registration failed. Check if email/vehicle exists."));
            }
        } catch (err) {
            setMessage("Network error. Server unreachable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="layout-main" style={{ padding: '40px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 className="form-title" style={{ fontSize: '32px' }}>Register a Customer</h1>
                    <p className="form-subtitle">Create a new customer account and link their vehicle details.</p>
                </div>
                <button onClick={submit} disabled={loading} className="form-button" style={{ width: 'auto', padding: '12px 32px' }}>
                    {loading ? "Registering..." : "Register Customer"}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Customer Information Card */}
                <section className="form-card" style={{ maxWidth: 'none', margin: 0, padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e4cf', paddingBottom: '16px' }}>
                        <FiUser size={24} color="#3d2817" />
                        <h2 style={{ margin: 0, fontSize: '22px', color: '#3d2817' }}>Customer Information</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Full Name</label>
                            <input className="form-input" placeholder="e.g. Arjun Adhikari" value={customer.fullName} onChange={(e) => setCustomer({...customer, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Email Address</label>
                            <input className="form-input" placeholder="arjun@example.com" value={customer.email} onChange={(e) => setCustomer({...customer, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Phone Number</label>
                            <input className="form-input" placeholder="+977 9812345678" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* Vehicle Details Card */}
                <section className="form-card" style={{ maxWidth: 'none', margin: 0, padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f0e4cf', paddingBottom: '16px' }}>
                        <FiTruck size={24} color="#3d2817" />
                        <h2 style={{ margin: 0, fontSize: '22px', color: '#3d2817' }}>Vehicle Details</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                            <div>
                                <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Year</label>
                                <input className="form-input" type="number" value={vehicle.year} onChange={(e) => setVehicle({...vehicle, year: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Make</label>
                                <input className="form-input" placeholder="Toyota / Ford / Mahindra" value={vehicle.make} onChange={(e) => setVehicle({...vehicle, make: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Model</label>
                            <input className="form-input" placeholder="Hilux / Scorpio / Camry" value={vehicle.model} onChange={(e) => setVehicle({...vehicle, model: e.target.value})} />
                        </div>
                        <div>
                            <label className="registration-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Plate Number (Vehicle Number)</label>
                            <input className="form-input" placeholder="e.g. BA 2 PA 5678" value={vehicle.vehicleNumber} onChange={(e) => setVehicle({...vehicle, vehicleNumber: e.target.value})} />
                        </div>
                    </div>
                </section>
            </div>

            {message && (
                <div className={`info-banner ${message.startsWith("Error") ? "error" : ""}`} style={{ marginTop: '32px', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ fontWeight: '600', textAlign: 'center' }}>{message}</div>
                </div>
            )}
        </main>
    );
}
