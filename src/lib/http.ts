import { API_BASE_URL } from "@/lib/api";

export const authHeaders = (json = false): Record<string, string> => {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const parseJsonSafe = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_PATTERN.test(value.trim());

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return fetch(apiUrl(path), { ...init, headers });
}

export function extractApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const message =
    record.detail ??
    record.Detail ??
    record.message ??
    record.Message ??
    record.title ??
    record.Title;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function readCustomerIdFromSession(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = localStorage.getItem("customerId") || localStorage.getItem("userId");
  if (fromStorage) return fromStorage;

  const token = localStorage.getItem("authToken");
  if (!token) return "";

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return "";
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const payload = JSON.parse(json) as Record<string, string>;
    return payload.CustomerId || payload.customerId || payload.sub || payload.nameid || payload.userId || "";
  } catch {
    return "";
  }
}
