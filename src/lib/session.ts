const AUTH_COOKIE = "authToken";

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
