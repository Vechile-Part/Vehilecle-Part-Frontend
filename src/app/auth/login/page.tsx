"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthFormHeader from "@/Components/auth/AuthFormHeader";
import AuthPageShell from "@/Components/auth/AuthPageShell";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";
import { getShellRoleFromToken, safeInternalPath } from "@/lib/jwtRole";
import { useAuth } from "@/Components/auth/AuthContext";

function extractToken(body: Record<string, unknown>): string | undefined {
    const direct = body.token ?? body.Token ?? body.accessToken ?? body.AccessToken;
    if (typeof direct === "string" && direct.includes(".")) return direct;
    const nested = body.data ?? body.Data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        return extractToken(nested as Record<string, unknown>);
    }
    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [nextPath] = useState(() => {
        if (typeof window === "undefined") return "";
        const q = new URLSearchParams(window.location.search);
        return safeInternalPath(q.get("next"), "");
    });
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const submit = async () => {
        if (!email.trim() || !password) {
            setMessage("Please enter both email and password.");
            return;
        }
        setMessage("");
        setLoading(true);
        try {
            const userRes = await apiFetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const userData = await parseJsonSafe(userRes);

            if (userRes.ok && isRecord(userData)) {
                const token = extractToken(userData);
                if (token) {
                    const shell = getShellRoleFromToken(token);
                    if (shell === "admin" || shell === "staff") {
                        login(token);
                        if (shell === "admin") {
                            const dest = nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin/dashboard";
                            router.push(dest);
                            return;
                        }
                        const staffDest =
                            nextPath && (nextPath.startsWith("/staff") || nextPath.startsWith("/pos"))
                                ? nextPath
                                : "/staff/dashboard";
                        router.push(staffDest);
                        return;
                    }
                }
            }

            const custRes = await apiFetch("/api/auth/customer/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const custData = await parseJsonSafe(custRes);

            if (custRes.ok && isRecord(custData)) {
                const token = (custData.token ?? custData.Token) as string | undefined;
                const sessionId = (custData.customerId ??
                    custData.CustomerId ??
                    custData.userId ??
                    custData.id) as string | undefined;
                if (token) {
                    login(token, sessionId ? String(sessionId) : null);
                    router.push(nextPath && nextPath.startsWith("/customer") ? nextPath : "/customer/dashboard");
                    return;
                }
            }

            const staffErr = isRecord(userData) ? extractApiError(userData, "") : "";
            const custErr = isRecord(custData) ? extractApiError(custData, "") : "";
            if (userRes.status === 401 && custRes.status === 401) {
                setMessage("Invalid email or password.");
                return;
            }
            setMessage(staffErr || custErr || "Invalid email or password.");
        } catch (error) {
            console.error(error);
            setMessage("Sign-in failed. Server is unreachable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageShell>
            <form
                className="auth-page-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!loading) void submit();
                }}
            >
                <AuthFormHeader title="Sign in">
                    <p className="auth-page-lead">
                        Admin, staff, and customer accounts all use this page. Enter the email and password for your
                        role.
                    </p>
                </AuthFormHeader>

                <div className="auth-page-field">
                    <label htmlFor="login-email">Email</label>
                    <input
                        id="login-email"
                        className="auth-page-input"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </div>

                <div className="auth-page-field">
                    <label htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        className="auth-page-input"
                        type="password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>

                <div className="auth-page-actions">
                    <Link href="/auth/register" className="auth-page-link">
                        New here? <strong>Create an account</strong>
                    </Link>
                    <button type="submit" className="auth-page-primary" disabled={loading}>
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </div>

                {message && (
                    <div className="auth-page-alert auth-page-alert-error" role="status">
                        {message}
                    </div>
                )}
            </form>
        </AuthPageShell>
    );
}
