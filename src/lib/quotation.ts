import { Quotation, IQuotationItem } from "@/models/Quotation";
import { Project } from "@/models/Project";
import { Setting } from "@/models/Setting";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
import { num, parseDate, str } from "@/lib/validation";

/** Project statuses in which a quotation still drives the project's status. Later stages are never regressed. */
export const PRE_APPROVAL_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REQUIREMENT_CLARIFICATION",
  "QUOTATION_PREPARATION",
  "QUOTATION_SENT",
  "AWAITING_APPROVAL",
];

/** Quotation statuses a student can still respond to. */
export const ACTIONABLE_STATUSES = ["SENT", "VIEWED"];

export const DEFAULT_PAYMENT_TERMS = "50% Advance on signing, 30% Milestone Demo, 20% on final handover.";

export async function getSettings() {
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  return settings;
}

export type ItemsResult = { ok: true; items: IQuotationItem[] } | { ok: false; error: string };

export function normalizeItems(raw: unknown): ItemsResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Please provide at least one quotation line item." };
  }
  const items: IQuotationItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const it: any = raw[i] || {};
    const description = str(it.description);
    const quantity = num(it.quantity);
    const unitPrice = num(it.unitPrice);
    if (!description) return { ok: false, error: `Line item ${i + 1} needs a description.` };
    if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
      return { ok: false, error: `Line item ${i + 1} needs a whole-number quantity of at least 1.` };
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: `Line item ${i + 1} needs a valid unit price.` };
    }
    items.push({ description, quantity, unitPrice, amount: quantity * unitPrice });
  }
  return { ok: true, items };
}

/** Single source of truth for quotation money math (all amounts are whole rupees). */
export function computeTotals(items: IQuotationItem[], discount: number, taxPercentage: number) {
  const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
  const appliedDiscount = Math.min(subtotal, Math.max(0, discount));
  const taxable = subtotal - appliedDiscount;
  const tax = Math.round((taxable * taxPercentage) / 100);
  return { subtotal, discount: appliedDiscount, tax, total: taxable + tax };
}

export function validateTaxPercentage(value: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = num(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, error: "Tax percentage must be a number between 0 and 100." };
  }
  return { ok: true, value: n };
}

export function validateDiscount(value: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = num(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Discount must be a non-negative number." };
  return { ok: true, value: n };
}

/** `validUntil` must be a real date that has not already passed (a bare date counts until the end of that day). */
export function validateValidUntil(value: unknown): { ok: true; value: Date } | { ok: false; error: string } {
  const d = parseDate(value, true);
  if (!d) return { ok: false, error: "Please provide a valid 'valid until' date." };
  if (d.getTime() < Date.now()) return { ok: false, error: "The quotation validity date cannot be in the past." };
  return { ok: true, value: d };
}

/** Tax rate a stored quotation was priced with (older records did not persist it, so derive it). */
export function effectiveTaxPercentage(q: { taxPercentage?: number; tax: number; subtotal: number; discount: number }): number {
  if (typeof q.taxPercentage === "number") return q.taxPercentage;
  const taxable = q.subtotal - q.discount;
  return taxable > 0 ? Math.round((q.tax / taxable) * 100) : 0;
}

/** Marks overdue, still-actionable quotations as EXPIRED so lists and filters tell the truth. */
export async function expireOverdueQuotations() {
  await Quotation.updateMany(
    { status: { $in: ACTIONABLE_STATUSES }, validUntil: { $lt: new Date() } },
    { $set: { status: "EXPIRED" } }
  );
}

/**
 * Sends a DRAFT quotation to the student: marks it SENT, supersedes older live versions,
 * moves an early-stage project to QUOTATION_SENT, notifies and emails the student.
 * Returns the saved quotation.
 */
export async function dispatchQuotation(quotationId: string, adminUserId: string) {
  const quotation = await Quotation.findByIdAndUpdate(
    quotationId,
    { $set: { status: "SENT", sentAt: new Date() } },
    { new: true }
  );
  if (!quotation) return null;

  // Older versions of the same quotation that the student could still act on are now superseded.
  await Quotation.updateMany(
    {
      quotationId: quotation.quotationId,
      version: { $lt: quotation.version },
      status: { $in: ["SENT", "VIEWED", "CHANGES_REQUESTED"] },
    },
    { $set: { status: "CANCELLED" } }
  );

  const project = await Project.findById(quotation.projectId);
  if (project) {
    if (PRE_APPROVAL_STATUSES.includes(project.status) && project.status !== "QUOTATION_SENT") {
      project.status = "QUOTATION_SENT";
      await project.save();
    }

    const revised = quotation.version > 1;
    await createNotification({
      userId: project.studentId,
      title: revised ? `Quotation Updated (v${quotation.version})` : "New Quotation Ready",
      message: `Quotation ${quotation.quotationId}${revised ? ` v${quotation.version}` : ""} (₹${quotation.total.toLocaleString()}) has been sent for project ${project.projectName}.`,
      type: "QUOTATION",
      relatedEntityId: quotation.quotationId,
      relatedEntityType: "QUOTATION",
    });

    const student = await User.findById(project.studentId);
    if (student) {
      const tmpl = EmailTemplates.quotationSent(student.name, project.projectName, quotation.quotationId, quotation.total);
      await sendEmail({ to: student.email, subject: tmpl.subject, html: tmpl.html });
    }

    await logActivity({
      userId: adminUserId,
      role: "ADMIN",
      action: "QUOTATION_SENT",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `Admin sent quotation ${quotation.quotationId} (v${quotation.version}) to student.`,
    });
  }

  return quotation;
}
