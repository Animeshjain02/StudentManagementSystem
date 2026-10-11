import mongoose from "mongoose";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value) && mongoose.isValidObjectId(value);
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

/** Trimmed string, or "" for anything that is not a string. */
export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Finite number from a number or numeric string; NaN otherwise (so `Number.isFinite` guards work). */
export function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Safe page/limit parsing: NaN, zero and negatives fall back to defaults; limit is capped. */
export function parsePagination(searchParams: URLSearchParams, defaultLimit = 10, maxLimit = 200) {
  const rawPage = parseInt(searchParams.get("page") || "", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Parses a date supplied by the UI. A bare `YYYY-MM-DD` is taken as the whole of that day
 * (`endOfDay` pins it to 23:59:59.999 UTC, which is what "valid until" means to a user).
 * Returns null for anything that is not a real date.
 */
export function parseDate(value: unknown, endOfDay = false): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return null;
  let d: Date;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    d = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  } else {
    d = new Date(raw);
  }
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Escapes a value for a CSV cell and neutralises spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Next sequential business id such as `PRJ-2026-00021`. Uses the highest existing number for the
 * prefix (not a document count), so deleted rows or extra document versions can never cause a
 * collision. Callers should still retry on duplicate-key errors for concurrent requests.
 */
export async function nextSequentialId(
  model: mongoose.Model<any>,
  field: string,
  prefix: string,
  pad: number,
  offset = 0
): Promise<string> {
  const rows = await model
    .find({ [field]: { $regex: `^${escapeRegex(prefix)}\\d+$` } })
    .select(field)
    .lean();
  let max = 0;
  for (const row of rows as any[]) {
    const n = parseInt(String(row[field]).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1 + offset).padStart(pad, "0")}`;
}

export function isDuplicateKeyError(err: any): boolean {
  return err?.code === 11000;
}
