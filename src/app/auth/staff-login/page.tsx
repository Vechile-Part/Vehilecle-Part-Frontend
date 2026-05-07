"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const API = "http://localhost:5019"; 

export default function StaffLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleLogin = async () => {
        try {
            const res = await fetch(`${API}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                setMessage("Login failed. Check your email and password.");
                return;
            }

            const data = await res.json();

            // Save the token and role so the app remembers you
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("userRole", data.role);

            setMessage("Login successful! Redirecting...");

            // Redirect based on role
            if (data.role === "Admin") {
                router.push("/admin/parts");
            } else {
                router.push("/staff/customers");
            }
        } catch (error) {
            setMessage("Error: Backend is not responding.");
        }
    };

    return (
        <main className="form-page">
            <section className="form-card narrow">
                <h1 className="form-title">Staff & Admin Login</h1>
                <p className="form-subtitle">Enter your credentials to manage the portal.</p>
                <div className="form-grid">
                    <input
                        className="form-input"
                        placeholder="Staff Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        className="form-input"
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button className="form-button" onClick={handleLogin}>Login as Staff</button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </section>
        </main>
    );
}
