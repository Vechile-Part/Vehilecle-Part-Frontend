export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

const NEPAL_OFFSET_MS = ((5 * 60 + 45) * 60) * 1000;

export type NepalDateParts = {
  year: number;
  month: number;
  day: number;
};

export function getNepalDateParts(date: Date = new Date()): NepalDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return { year, month, day };
}

export function nepalDateKey(year: number, month: number, day: number): number {
  return year * 10_000 + month * 100 + day;
}

export function isNepalDateBefore(
  year: number,
  month: number,
  day: number,
  other: NepalDateParts,
): boolean {
  return nepalDateKey(year, month, day) < nepalDateKey(other.year, other.month, other.day);
}

export function parseTimeSlotLabel(slot: string): { hour24: number; minute: number } | null {
  const trimmed = slot.trim();
  const space = trimmed.lastIndexOf(" ");
  if (space <= 0) return null;

  const timePart = trimmed.slice(0, space).trim();
  const meridiem = trimmed.slice(space + 1).trim().toUpperCase();
  if (meridiem !== "AM" && meridiem !== "PM") return null;

  const colon = timePart.indexOf(":");
  if (colon <= 0) return null;

  const hour12 = Number(timePart.slice(0, colon));
  const minute = Number(timePart.slice(colon + 1));
  if (!Number.isFinite(hour12) || !Number.isFinite(minute)) return null;
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;

  let hour24 = hour12 % 12;
  if (meridiem === "PM") hour24 += 12;

  return { hour24, minute };
}

export function nepalLocalSlotToUtc(
  year: number,
  month: number,
  day: number,
  slot: string,
): Date | null {
  const parsed = parseTimeSlotLabel(slot);
  if (!parsed) return null;

  const utcMs =
    Date.UTC(year, month - 1, day, parsed.hour24, parsed.minute, 0, 0) - NEPAL_OFFSET_MS;
  return new Date(utcMs);
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getNepalWeekday(year: number, month: number, day: number): number {
  const anchor = nepalLocalSlotToUtc(year, month, day, "12:00 PM");
  if (!anchor) return 0;

  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: NEPAL_TIME_ZONE,
    weekday: "short",
  }).format(anchor);

  return WEEKDAY_TO_INDEX[short] ?? 0;
}

export function formatNepalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("en-NP", {
    timeZone: NEPAL_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatNepalTimeOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("en-NP", {
    timeZone: NEPAL_TIME_ZONE,
    timeStyle: "short",
  });
}

export function isNepalDateToday(iso: string, reference: Date = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const parts = getNepalDateParts(date);
  const today = getNepalDateParts(reference);
  return (
    parts.year === today.year && parts.month === today.month && parts.day === today.day
  );
}
