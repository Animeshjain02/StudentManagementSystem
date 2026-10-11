import { createHash } from "crypto";

const TRACKING_SALT = process.env.TRACKING_SALT || "campus_ambassador_project_tracking_2026";

/**
 * Generates a deterministic, collision-resistant 16-character hex hash for any Project ID.
 * Example: "PRJ-2026-00001" -> "9f84d7008cb373ab"
 */
export function generateTrackingHash(projectId: string): string {
  if (!projectId) return "";
  const normalized = projectId.trim().toUpperCase();
  return createHash("sha256")
    .update(`${normalized}:${TRACKING_SALT}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Checks whether an input string is already a 16-character hex tracking hash.
 */
export function isTrackingHash(value: string): boolean {
  if (!value) return false;
  return /^[a-f0-9]{16}$/i.test(value.trim());
}
