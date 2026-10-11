import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { Project } from "@/models/Project";
import { QUOTATION_STATUSES } from "@/models/Quotation";
import { logActivity } from "@/lib/activity";
import {
  computeTotals,
  DEFAULT_PAYMENT_TERMS,
  dispatchQuotation,
  expireOverdueQuotations,
  getSettings,
  normalizeItems,
  validateDiscount,
  validateTaxPercentage,
  validateValidUntil,
  PRE_APPROVAL_STATUSES,
} from "@/lib/quotation";
import { isDuplicateKeyError, isObjectId, nextSequentialId, str } from "@/lib/validation";

let lastExpireCheck = 0;
const EXPIRE_CHECK_INTERVAL_MS = 60_000;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Debounce overdue quotation expiry check so GET requests aren't blocked by DB write operations
    if (Date.now() - lastExpireCheck > EXPIRE_CHECK_INTERVAL_MS) {
      lastExpireCheck = Date.now();
      expireOverdueQuotations().catch((e) => console.error("Auto-expire quotation error:", e));
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const query: any = {};
    if (status) {
      const statuses = status.split(",").map((x) => x.trim()).filter((x) => (QUOTATION_STATUSES as readonly string[]).includes(x));
      query.status = { $in: statuses };
    }

    if (session.role === "STUDENT") {
      // Find all projects belonging to student; drafts were never sent so they stay hidden
      const studentProjects = await Project.find({ studentId: session.userId }).select("_id").lean();
      const projectIds = studentProjects.map((p: any) => p._id);
      query.projectId = { $in: projectIds };
      query.sentAt = { $exists: true };
    } else if (projectId) {
      if (!isObjectId(projectId)) {
        return NextResponse.json({ error: "Invalid project reference." }, { status: 400 });
      }
      query.projectId = projectId;
    }

    const quotations = await Quotation.find(query)
      .select("quotationId projectId version subtotal discount tax total validUntil paymentTerms status sentAt viewedAt acceptedAt rejectedAt createdAt")
      .populate("projectId", "projectId projectName clientName clientEmail collegeName")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ quotations });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can create quotations." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { projectId, items, validUntil, paymentTerms, deliveryTimeline, terms, notes, sendImmediately = false } = body;

    if (!isObjectId(projectId)) {
      return NextResponse.json({ error: "Please select a valid project." }, { status: 400 });
    }

    const parsedItems = normalizeItems(items);
    if (!parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 });
    }

    await connectToDatabase();
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const settings = await getSettings();

    // Defaults come from the admin-configurable system settings
    const taxCheck = validateTaxPercentage(body.taxPercentage ?? settings.taxPercentage);
    if (!taxCheck.ok) return NextResponse.json({ error: taxCheck.error }, { status: 400 });
    const discountCheck = validateDiscount(body.discount ?? 0);
    if (!discountCheck.ok) return NextResponse.json({ error: discountCheck.error }, { status: 400 });

    const validityInput =
      validUntil || new Date(Date.now() + (settings.defaultQuotationValidityDays || 15) * 86400000).toISOString();
    const validityCheck = validateValidUntil(validityInput);
    if (!validityCheck.ok) return NextResponse.json({ error: validityCheck.error }, { status: 400 });

    // Auto-calculate subtotal, discount, tax, total (RULE 14: Prevent manual manipulation)
    const totals = computeTotals(parsedItems.items, discountCheck.value, taxCheck.value);

    const year = new Date().getFullYear();
    let quotation: any = null;
    for (let attempt = 0; attempt < 5 && !quotation; attempt++) {
      const quotationId = await nextSequentialId(Quotation, "quotationId", `QT-${year}-`, 4, attempt);
      try {
        quotation = await Quotation.create({
          quotationId,
          projectId: project._id,
          version: 1,
          items: parsedItems.items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          taxPercentage: taxCheck.value,
          total: totals.total,
          validUntil: validityCheck.value,
          paymentTerms: str(paymentTerms) || settings.defaultPaymentTerms || DEFAULT_PAYMENT_TERMS,
          deliveryTimeline: str(deliveryTimeline) || "30 to 45 Business Days",
          terms:
            str(terms) ||
            "1. All deliverables include 60 days of bug-fix warranty.\n2. Scope alterations subject to formal change order.",
          notes: str(notes),
          status: "DRAFT",
          createdBy: session.userId,
        });
      } catch (err: any) {
        if (!isDuplicateKeyError(err) || attempt === 4) throw err;
      }
    }

    // Only an early-stage project is driven by its quotation; never regress an approved/running project.
    if (PRE_APPROVAL_STATUSES.includes(project.status) && project.status !== "QUOTATION_SENT") {
      project.status = "QUOTATION_PREPARATION";
      await project.save();
    }

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "QUOTATION_CREATED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `Admin created quotation ${quotation.quotationId} (v1) totaling ₹${totals.total.toLocaleString()}.`,
      metadata: { ...totals, taxPercentage: taxCheck.value, status: quotation.status },
    });

    if (sendImmediately) {
      quotation = (await dispatchQuotation(quotation._id.toString(), session.userId)) || quotation;
    }

    return NextResponse.json({
      success: true,
      message: "Quotation created successfully.",
      quotation,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
