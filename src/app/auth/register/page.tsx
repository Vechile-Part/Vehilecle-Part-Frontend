"use client";

import Link from "next/link";
import { useState } from "react";
import AuthFormHeader from "@/Components/auth/AuthFormHeader";
import AuthPageShell from "@/Components/auth/AuthPageShell";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

export default function CustomerRegisterPage() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);

    const submit = async () => {
        if (password.length < 8) {
            setResult({ kind: "error", message: "Password must be at least 8 characters." });
            return;
        }
        if (password !== confirmPassword) {
            setResult({ kind: "error", message: "Passwords do not match." });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await apiFetch("/api/customers/self-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, phone, email, password }),
            });
            const data = await parseJsonSafe(res);
            if (res.ok) {
                setResult({
                    kind: "success",
                    message: "Registered successfully. You can sign in now.",
                });
                return;
            }
            setResult({
                kind: "error",
                message: extractApiError(data, "Registration failed. Please try again."),
            });
        } catch (err) {
            setResult({
                kind: "error",
                message: err instanceof Error ? err.message : "Network error",
            });
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
                <AuthFormHeader title="Create your account">
                    <p className="auth-page-lead">
                        Register yourself and choose a password now. If staff added you at the workshop, use the link
                        in your email to set a password instead—do not use this form.
                    </p>
                </AuthFormHeader>

                <div className="auth-page-field">
                    <label htmlFor="reg-fullName">Full name</label>
                    <input
                        id="reg-fullName"
                        className="auth-page-input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        required
                    />
                </div>

                <div className="auth-page-row">
                    <div className="auth-page-field">
                        <label htmlFor="reg-email">Email</label>
                        <input
                            id="reg-email"
                            className="auth-page-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>
                    <div className="auth-page-field">
                        <label htmlFor="reg-phone">Phone</label>
                        <input
                            id="reg-phone"
                            className="auth-page-input"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                            required
                        />
                    </div>
                </div>

                <div className="auth-page-field">
                    <label htmlFor="reg-password">Password</label>
                    <input
                        id="reg-password"
                        className="auth-page-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="auth-page-field">
                    <label htmlFor="reg-confirm">Confirm password</label>
                    <input
                        id="reg-confirm"
                        className="auth-page-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="auth-page-actions">
                    <Link href="/auth/login" className="auth-page-link">
                        Already have an account? <strong>Sign in</strong>
                    </Link>
                    <button type="submit" className="auth-page-primary" disabled={loading}>
                        {loading ? "Registering…" : "Register"}
                    </button>
                </div>

                {result && (
                    <div className={`auth-page-alert auth-page-alert-${result.kind}`} role="status">
                        {result.message}
                    </div>
                )}
            </form>
        </AuthPageShell>
    );
}
