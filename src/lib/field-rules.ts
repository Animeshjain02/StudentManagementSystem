/**
 * Field validation rules shared by the forms (client) and the API routes (server), so both
 * always agree. Pure functions only: no Node / database imports, safe for the browser bundle.
 */

export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PERSON_NAME_RE = /^\p{L}[\p{L}\p{M}\s.'\-]*$/u;
const PHONE_CHARS_RE = /^\+?[0-9][0-9\s\-()]*$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** Validates Indian phone numbers (10 digits starting with 6, 7, 8, or 9; allows optional +91/0 prefix). */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith("0")
    ? digits.slice(1)
    : digits;
  return /^[6-9][0-9]{9}$/.test(normalized);
}

export function isValidPersonName(value: string, min = 2, max = 80): boolean {
  const v = value.trim();
  return v.length >= min && v.length <= max && PERSON_NAME_RE.test(v);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Splits a free-text "links" field on whitespace / commas. */
export function splitLinks(value: string): string[] {
  return value.split(/[\s,]+/).filter(Boolean);
}

export interface ProjectFieldValues {
  projectName?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  collegeName?: string;
  department?: string;
  projectType?: string;
  description?: string;
  functionalRequirements?: string;
  technicalRequirements?: string;
  expectedFeatures?: string;
  referenceLinks?: string;
}

export type FieldErrors = Partial<Record<keyof ProjectFieldValues | "document", string>>;

/** Validates every project-submission attribute; returns a map of field -> message (empty = valid). */
export function validateProjectFields(v: ProjectFieldValues, projectTypes: readonly string[]): FieldErrors {
  const e: FieldErrors = {};
  const s = (x?: string) => (x ?? "").trim();

  const name = s(v.projectName);
  if (!name) e.projectName = "Project title is required.";
  else if (name.length < 3 || name.length > 120) e.projectName = "Project title must be 3-120 characters.";

  const client = s(v.clientName);
  if (!client) e.clientName = "Client name is required.";
  else if (!isValidPersonName(client)) e.clientName = "Enter a valid name (2-80 letters; spaces, . ' - allowed).";

  const email = s(v.clientEmail);
  if (!email) e.clientEmail = "Client email is required.";
  else if (!isValidEmail(email)) e.clientEmail = "Enter a valid email address (e.g. name@college.edu).";

  const phone = s(v.clientPhone);
  if (!phone) {
    e.clientPhone = "Client contact number is required.";
  } else if (!isValidPhone(phone)) {
    e.clientPhone = "Phone number must be exactly 10 digits (numbers only).";
  }

  if (s(v.collegeName) && (s(v.collegeName).length < 2 || s(v.collegeName).length > 120)) {
    e.collegeName = "College name must be 2-120 characters.";
  }
  if (s(v.department) && (s(v.department).length < 2 || s(v.department).length > 100)) {
    e.department = "Department must be 2-100 characters.";
  }

  if (!s(v.projectType) || !projectTypes.includes(s(v.projectType))) {
    e.projectType = "Select a valid project type.";
  }

  const desc = s(v.description);
  if (!desc) e.description = "Project description is required.";
  else if (desc.length < 20) e.description = "Please describe the project in at least 20 characters.";
  else if (desc.length > 5000) e.description = "Description is too long (max 5000 characters).";

  for (const [key, label] of [
    ["functionalRequirements", "Functional requirements"],
    ["technicalRequirements", "Technical requirements"],
    ["expectedFeatures", "Expected features"],
  ] as const) {
    if (s(v[key]).length > 3000) e[key] = `${label} are too long (max 3000 characters).`;
  }

  const links = splitLinks(s(v.referenceLinks));
  if (links.length > 5) e.referenceLinks = "Add at most 5 links.";
  else if (links.some((l) => !isHttpUrl(l))) {
    e.referenceLinks = "Every link must start with http:// or https:// (separate several with spaces or commas).";
  }

  return e;
}

/** Client-side file check (the server re-checks the real file contents). */
export function validatePdfFile(file: { name: string; size: number; type: string }): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files can be uploaded.";
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_PDF_BYTES) return `The PDF is too large (max ${MAX_PDF_BYTES / 1024 / 1024} MB).`;
  return null;
}

export interface StudentFieldValues {
  name?: string;
  phone?: string;
  collegeName?: string;
  university?: string;
  course?: string;
  branch?: string;
  semester?: string;
  collegeId?: string;
  referralCode?: string;
}

/**
 * Validates ambassador details. With `requireAll` (onboarding) the core fields must be present;
 * otherwise (edits) only the supplied fields are checked. Returns field -> message.
 */
export function validateStudentFields(v: StudentFieldValues, requireAll: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  const has = (x?: string) => x !== undefined;
  const s = (x?: string) => (x ?? "").trim();
  const text = (key: keyof StudentFieldValues, label: string, min: number, max: number, required: boolean) => {
    if (!has(v[key]) && !required) return;
    const val = s(v[key]);
    if (!val) {
      if (required || has(v[key])) {
        if (required) e[key] = `${label} is required.`;
        else if (key !== "university") e[key] = `${label} cannot be empty.`;
      }
    } else if (val.length < min || val.length > max) e[key] = `${label} must be ${min}-${max} characters.`;
  };

  if (requireAll || has(v.name)) {
    if (!s(v.name)) e.name = "Full name is required.";
    else if (!isValidPersonName(s(v.name))) e.name = "Enter a valid full name (2-80 letters; spaces, . ' - allowed).";
  }
  if (requireAll || has(v.phone)) {
    if (!s(v.phone)) e.phone = "Phone number is required.";
    else if (!isValidPhone(s(v.phone))) e.phone = "Enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).";
  }
  text("collegeName", "College name", 2, 120, requireAll);
  text("university", "University", 2, 120, false);
  text("course", "Course", 1, 80, requireAll);
  text("branch", "Branch", 1, 80, requireAll);
  text("semester", "Semester", 1, 40, requireAll);
  if (s(v.collegeId) && !/^[A-Za-z0-9\-_/.]{1,40}$/.test(s(v.collegeId))) {
    e.collegeId = "College ID may contain letters, numbers and - _ / . (max 40).";
  }
  if (s(v.referralCode) && !/^[A-Za-z0-9\-_]{3,30}$/.test(s(v.referralCode))) {
    e.referralCode = "Referral code must be 3-30 letters, numbers, - or _.";
  }
  return e;
}

/**
 * Automatically format college name into a short code/acronym.
 * E.g. "ACEIT" -> "ACEIT", "Arya College of Engineering & IT (ACEIT)" -> "ACEIT", "IIT Delhi" -> "IITD"
 */
export function formatCollegeCode(college?: string): string {
  if (!college) return "";
  const trimmed = college.trim();
  const paren = trimmed.match(/\(([A-Za-z0-9]+)\)/);
  if (paren) return paren[1].toUpperCase();

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 10);

  const stopWords = new Set(["OF", "AND", "&", "THE", "IN", "FOR"]);
  const significant = words.filter((w) => !stopWords.has(w));
  if (significant.length > 1) {
    if (significant.every((w) => w.length <= 4) && significant.join("").length <= 8) {
      return significant.join("");
    }
    return significant.map((w) => w[0]).join("");
  }
  return words[0].slice(0, 10);
}

/**
 * Automatically format branch/department name into standard short code.
 * E.g. "CS" -> "CS", "Computer Science" -> "CS", "Information Technology" -> "IT", "Mechanical" -> "ME"
 */
export function formatBranchCode(branch?: string): string {
  if (!branch) return "";
  const trimmed = branch.trim();
  const paren = trimmed.match(/\(([A-Za-z0-9]+)\)/);
  if (paren) return paren[1].toUpperCase();

  const lower = trimmed.toLowerCase();
  if (lower.includes("computer") || lower.includes("cse") || lower === "cs") return "CS";
  if (lower.includes("information tech") || lower === "it") return "IT";
  if (lower.includes("electronic") && lower.includes("comm")) return "ECE";
  if (lower.includes("electronic")) return "ECE";
  if (lower.includes("electrical")) return "EE";
  if (lower.includes("mechanical") || lower === "me") return "ME";
  if (lower.includes("civil") || lower === "ce") return "CE";
  if (lower.includes("artificial") || lower === "ai") return "AI";
  if (lower.includes("data") || lower === "ds") return "DS";

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 6);

  const stopWords = new Set(["OF", "AND", "&", "THE", "IN", "ENGINEERING", "ENGG"]);
  const significant = words.filter((w) => !stopWords.has(w));
  if (significant.length > 0) {
    return significant.map((w) => w[0]).join("").slice(0, 6);
  }
  return words.map((w) => w[0]).join("").slice(0, 6);
}

/**
 * Generates project ID in the format: [college]-[branch]-[last 4 digits of phone number].
 * E.g. ACEIT-CS-8976
 */
export function generateProjectId(college?: string, branch?: string, phone?: string): string {
  const c = formatCollegeCode(college);
  const b = formatBranchCode(branch);
  const digits = (phone || "").replace(/\D/g, "");
  const p = digits.length >= 4 ? digits.slice(-4) : digits;

  if (!c && !b && !p) return "";
  return `${c || "COLLEGE"}-${b || "BRANCH"}-${p || "XXXX"}`;
}

