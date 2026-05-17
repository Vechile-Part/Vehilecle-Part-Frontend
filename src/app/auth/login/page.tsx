"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getRolesFromToken, roleStringImpliesAdmin, roleStringImpliesStaff, safeInternalPath } from "@/lib/jwtRole";

const API = API_BASE_URL;

async function parseJsonSafe(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function extractToken(body: Record<string, unknown>): string | undefined {
    const direct = body.token ?? body.Token ?? body.accessToken ?? body.AccessToken;
    if (typeof direct === "string" && direct.includes(".")) return direct;
    const nested = body.data ?? body.Data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return extractToken(nested as Record<string, unknown>);
    }
    return undefined;
}

function resolveUserKind(token: string, body: Record<string, unknown>): "admin" | "staff" | null {
    const raw = body.role ?? body.Role;
    if (typeof raw === "number") {
        if (raw === 1) return "admin";
        if (raw === 2) return "staff";
    }
    const s = String(raw ?? "").trim();
    if (roleStringImpliesAdmin(s)) return "admin";
    if (roleStringImpliesStaff(s)) return "staff";
    for (const r of getRolesFromToken(token)) {
        if (roleStringImpliesAdmin(r)) return "admin";
        if (roleStringImpliesStaff(r)) return "staff";
    }
    return null;
}

export default function LoginPage() {
    const router = useRouter();
    const [nextPath] = useState(() => {
        if (typeof window === "undefined") return "";
        const q = new URLSearchParams(window.location.search);
        return safeInternalPath(q.get("next"), "");
    });
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const submit = async () => {
        if (!email.trim() || !password) {
            setMessage("Please enter both email and password.");
            return;
        }
        setMessage("");
        try {
            const userRes = await fetch(`${API}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const userData = (await parseJsonSafe(userRes)) as Record<string, unknown> | null;

            if (userRes.ok && userData) {
                const token = extractToken(userData);
                if (!token) {
                    setMessage("Sign-in could not be completed.");
                    return;
                }
                const kind = resolveUserKind(token, userData);
                if (!kind) {
                    setMessage("Sign-in could not be completed.");
                    return;
                }
                localStorage.setItem("authToken", token);
                localStorage.removeItem("customerId");
                if (kind === "admin") {
                    const dest = nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin/parts";
                    router.push(dest);
                    return;
                }
                router.push(nextPath || "/staff/register");
                return;
            }

            const custRes = await fetch(`${API}/api/auth/customer/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const custData = (await parseJsonSafe(custRes)) as Record<string, unknown> | null;

            if (custRes.ok && custData) {
                const token = (custData.token ?? custData.Token) as string | undefined;
                const sessionId = (custData.customerId ?? custData.CustomerId ?? custData.userId ?? custData.id) as string | undefined;
                if (token) localStorage.setItem("authToken", token);
                if (sessionId) localStorage.setItem("customerId", String(sessionId));
                router.push("/customer/profile");
                return;
            }

            setMessage("Invalid email or password.");
        } catch (error) {
            console.error(error);
            setMessage("Sign-in failed. Server is unreachable.");
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
                        placeholder="Email"
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
                    <button
                        type="button"
                        onClick={submit}
                        className="form-button"
                    >
                        Sign in
                    </button>
                </div>

                <div className="form-footer">
                    <p>
                        New here? <Link href="/auth/register" className="form-link">Create an account</Link>
                    </p>
                    <p style={{ marginTop: '8px' }}>
                        Staff registration? <Link href="/auth/login?next=/staff/register" className="form-link-sub">Click here</Link>
                    </p>
                </div>

                {message && <p className="form-message">{message}</p>}
            </section>
        </main>
    );
}
