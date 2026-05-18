const AUTH_COOKIE = "authToken";

export function readAuthTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]*)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Ensures apiFetch can read a token from localStorage (syncs from cookie when needed). */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("authToken");
  if (stored?.includes(".")) return stored;
  const fromCookie = readAuthTokenFromCookie();
  if (fromCookie?.includes(".")) {
    localStorage.setItem("authToken", fromCookie);
    return fromCookie;
  }
  return null;
}

export function persistAuthSession(token: string, customerId?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", token);
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`;
  if (customerId) localStorage.setItem("customerId", customerId);
  else localStorage.removeItem("customerId");
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
  localStorage.removeItem("customerId");
  localStorage.removeItem("userId");
  document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function logoutAndGoToLogin(): void {
  clearAuthSession();
  window.location.replace("/auth/login");
}
