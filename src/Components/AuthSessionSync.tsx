"use client";

import { useEffect } from "react";
import { getAuthToken, persistAuthSession, readAuthTokenFromCookie } from "@/lib/session";

/** Keeps auth cookie and localStorage in sync for API calls and middleware. */
export default function AuthSessionSync() {
  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    const fromCookie = readAuthTokenFromCookie();
    const customerId = localStorage.getItem("customerId");

    if (stored?.includes(".") && !fromCookie) {
      persistAuthSession(stored, customerId);
      return;
    }

    if (fromCookie?.includes(".") && !stored?.includes(".")) {
      persistAuthSession(fromCookie, customerId);
      return;
    }

    getAuthToken();
  }, []);

  return null;
}
