"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/http";

export default function ApiStatusPage() {
    const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

    useEffect(() => {
        fetch(apiUrl("/api/admin/parts"), { method: "HEAD" })
            .then((res) => setStatus(res.status === 401 || res.ok ? "online" : "offline"))
            .catch(() => setStatus("offline"));
    }, []);

    return (
        <main className="form-page">
            <section className="form-card narrow">
                <h1 className="form-title">API Status</h1>
                <p className="form-subtitle">
                    Backend API:{" "}
                    <strong>
                        {status === "checking" ? "Checking…" : status === "online" ? "Reachable" : "Unreachable"}
                    </strong>
                </p>
                <p className="form-message" style={{ color: "var(--pt-muted)" }}>
                    A 401 response means the API is running but requires authentication.
                </p>
            </section>
        </main>
    );
}
