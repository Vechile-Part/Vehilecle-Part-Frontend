import type { PurchaseInvoice } from "./types";

export const formatDateParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { monthDay: "Unknown", year: "date" };
  }

  return {
    monthDay: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    year: date.toLocaleDateString("en-US", { year: "numeric" }),
  };
};

export const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseJsonText = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

export const parseJsonSafe = async (res: Response) => {
  return parseJsonText(await res.text());
};

export const readString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

export const readNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const extractRecords = (data: unknown, keys: string[] = ["items", "customers", "results", "data", "value"]) => {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];

  for (const key of keys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  return [data];
};

export const sanitizeApiMessage = (message: string) =>
  message.replace(/\s*POSITION:[\s\S]*$/, "").replace(/\s+/g, " ").trim();

export const readApiErrorMessage = (data: unknown, status: number, fallback: string) => {
  if (isRecord(data)) {
    const candidate = readString(data.detail ?? data.message ?? data.title);
    if (candidate) return sanitizeApiMessage(candidate) || `${fallback} (HTTP ${status})`;
  }

  return `${fallback} (HTTP ${status})`;
};

export const getHistoryTone = (invoice: PurchaseInvoice) => invoice.statusTone ?? "delivered";

export const getHistoryStatusClass = (invoice: PurchaseInvoice) => {
  const tone = getHistoryTone(invoice);
  if (tone === "refunded") return "refund";
  if (tone === "pending") return "credit";
  return "settled";
};
