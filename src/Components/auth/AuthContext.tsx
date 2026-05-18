"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getShellRoleFromToken, parseJwtPayload } from "@/lib/jwtRole";
import { persistAuthSession, clearAuthSession } from "@/lib/session";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "customer";
  customerId?: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (token: string, customerId?: string | null) => void;
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const decodeAndSetUser = (token: string) => {
    try {
      const payload = parseJwtPayload(token);
      const role = getShellRoleFromToken(token);
      if (!payload || !role) {
        setUser(null);
        return;
      }

      // Extract details
      const id = String(payload.nameid ?? payload.sub ?? payload.Id ?? payload.UserId ?? payload.userId ?? payload.CustomerId ?? payload.customerId ?? "");
      const email = String(
        payload.email ??
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
        ""
      );
      const name = String(
        payload.unique_name ??
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
        role
      );
      const customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null;

      setUser({
        id,
        name,
        email,
        role,
        customerId
      });
    } catch {
      setUser(null);
    }
  };

  const refreshSession = () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("authToken");
    if (token) {
      decodeAndSetUser(token);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = (token: string, customerId?: string | null) => {
    persistAuthSession(token, customerId);
    decodeAndSetUser(token);
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
