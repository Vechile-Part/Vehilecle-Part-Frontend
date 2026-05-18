"use client";

import { useEffect } from "react";
import { persistAuthSession } from "@/lib/session";

/** Keeps middleware auth cookie in sync when only localStorage was set (legacy sessions). */
export default function AuthSessionSync() {
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    if (document.cookie.includes("authToken=")) return;
    const customerId = localStorage.getItem("customerId");
    persistAuthSession(token, customerId);
  }, []);

  return null;
}
