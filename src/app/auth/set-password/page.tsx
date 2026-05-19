"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthFormHeader from "@/Components/auth/AuthFormHeader";
import AuthPageShell from "@/Components/auth/AuthPageShell";
import { apiFetch, extractApiError, parseJsonSafe } from "@/lib/http";

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const tokenFromUrl = searchParams.get("token") ?? "";
    const isStaffInvite = searchParams.get("kind") === "staff";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const submit = async () => {
        setMessage("");
        setSuccess(false);
        if (!tokenFromUrl.trim()) {
            setMessage("This page needs a valid link from your invitation email.");
            return;
        }
        if (password.length < 8) {
            setMessage("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirm) {
            setMessage("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const endpoint = isStaffInvite
                ? "/api/auth/staff/complete-invite-password"
                : "/api/auth/customer/complete-invite-password";
            const res = await apiFetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: tokenFromUrl.trim(), newPassword: password }),
            });
            const data = await parseJsonSafe(res);
            if (!res.ok) {
                setMessage(extractApiError(data, "Could not save password."));
                return;
            }
            setSuccess(true);
            setMessage("Password saved. You can sign in.");
        } catch {
            setMessage("Request failed. Check your connection and try again.");
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
                <AuthFormHeader title="Set your password">
                    <p className="auth-page-lead">
                        {isStaffInvite
                            ? "Your PartTrack staff account was created by an administrator. Choose a password to finish."
                            : "An account was started for you at the workshop. Choose a password to finish. To register yourself instead, use "}
                        {!isStaffInvite && (
                            <>
                                <Link href="/auth/register" className="auth-page-foot-link">
                                    create an account
                                </Link>
                                .
                            </>
                        )}
                    </p>
                </AuthFormHeader>

                <div className="auth-page-field">
                    <label htmlFor="invite-password">New password</label>
                    <input
                        id="invite-password"
                        className="auth-page-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                    />
                </div>

                <div className="auth-page-field">
                    <label htmlFor="invite-confirm">Confirm password</label>
                    <input
                        id="invite-confirm"
                        className="auth-page-input"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        required
                    />
                </div>

                <div className="auth-page-actions">
                    <Link href="/auth/login" className="auth-page-link">
                        Back to <strong>sign in</strong>
                    </Link>
                    <button type="submit" className="auth-page-primary" disabled={loading}>
                        {loading ? "Saving…" : "Save password"}
                    </button>
                </div>

                {message && (
                    <div
                        className={`auth-page-alert auth-page-alert-${success ? "success" : "error"}`}
                        role="status"
                    >
                        {message}
                    </div>
                )}
            </form>
        </AuthPageShell>
    );
}

export default function SetPasswordFromInvitePage() {
    return (
        <Suspense fallback={null}>
            <SetPasswordForm />
        </Suspense>
    );
}
