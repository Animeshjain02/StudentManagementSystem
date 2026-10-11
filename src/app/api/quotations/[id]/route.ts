import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { logActivity } from "@/lib/activity";
import {
  computeTotals,
  dispatchQuotation,
  effectiveTaxPercentage,
  expireOverdueQuotations,
  normalizeItems,
  validateDiscount,
  validateTaxPercentage,
  validateValidUntil,
} from "@/lib/quotation";
import { isDuplicateKeyError, isObjectId, str } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    await expireOverdueQuotations();

    let quotation = null;
    if (isObjectId(id)) {
      quotation = await Quotation.findById(id).populate("projectId").populate("createdBy", "name email");
    } else {
      // Find latest version by quotationId
      quotation = await Quotation.findOne({ quotationId: id })
        .sort({ version: -1 })
        .populate("projectId")
        .populate("createdBy", "name email");
    }

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const project = quotation.projectId as any;

    if (session.role === "STUDENT") {
      // Security check: if student, project must belong to student
      if (project.studentId.toString() !== session.userId) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view this quotation." },
          { status: 403 }
        );
      }
      // Drafts were never sent to the student, so they do not exist from their point of view
      if (!quotation.sentAt) {
        return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
      }
    }

    // Auto mark as VIEWED if first time opened by student
    if (session.role === "STUDENT" && quotation.status === "SENT") {
      quotation.status = "VIEWED";
      quotation.viewedAt = new Date();
      await quotation.save();

      await logActivity({
        userId: session.userId,
        role: "STUDENT",
        action: "QUOTATION_VIEWED",
        projectId: project._id,
        entityId: quotation.quotationId,
        entityType: "QUOTATION",
        description: `${session.name} opened and viewed quotation ${quotation.quotationId} (v${quotation.version}).`,
      });
    }

    // Fetch version history (students only see versions that were actually sent)
    const versionHistory = await Quotation.find({
      quotationId: quotation.quotationId,
      ...(session.role === "STUDENT" ? { sentAt: { $exists: true } } : {}),
    })
      .sort({ version: 1 })
      .select("version total status createdAt changeReason previousAmount");

    const latest = versionHistory[versionHistory.length - 1];

    return NextResponse.json({
      quotation: { ...quotation.toObject(), taxPercentage: effectiveTaxPercentage(quotation) },
      project,
      versionHistory,
      latestVersionId: latest?._id,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can modify quotations." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }
    const body = await req.json();
    await connectToDatabase();

    const existing = await Quotation.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    if (existing.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Cannot modify an accepted quotation. Preserving accepted agreement." },
        { status: 400 }
      );
    }

    // Only the newest version of a quotation can be revised; older ones are history.
    const newest = await Quotation.findOne({ quotationId: existing.quotationId }).sort({ version: -1 });
    if (existing.status === "CANCELLED" || (newest && newest.version > existing.version)) {
      return NextResponse.json(
        { error: "This version has been superseded or cancelled. Please revise the latest version instead." },
        { status: 400 }
      );
    }

    // Validate everything before touching the database
    let items = existing.items;
    if (body.items !== undefined) {
      const parsed = normalizeItems(body.items);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      items = parsed.items as any;
    }
    const discountCheck = validateDiscount(body.discount ?? existing.discount);
    if (!discountCheck.ok) return NextResponse.json({ error: discountCheck.error }, { status: 400 });
    // A revision keeps the tax rate the quotation was originally priced with unless explicitly changed.
    const taxCheck = validateTaxPercentage(body.taxPercentage ?? effectiveTaxPercentage(existing));
    if (!taxCheck.ok) return NextResponse.json({ error: taxCheck.error }, { status: 400 });
    let validUntil = existing.validUntil;
    if (body.validUntil) {
      const v = validateValidUntil(body.validUntil);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      validUntil = v.value;
    }

    const totals = computeTotals(items, discountCheck.value, taxCheck.value);
    const paymentTerms = str(body.paymentTerms) || existing.paymentTerms;
    const deliveryTimeline = str(body.deliveryTimeline) || existing.deliveryTimeline;
    const terms = str(body.terms) || existing.terms;
    const notes = body.notes !== undefined ? str(body.notes) : existing.notes;

    // QUOTATION VERSIONING (Requirement 20)
    // Once a quotation has been SENT (or answered / expired), changes create a new version;
    // the old version stays in history and is superseded when the new one is sent.
    const needsNewVersion = ["SENT", "VIEWED", "CHANGES_REQUESTED", "REJECTED", "EXPIRED"].includes(existing.status);

    if (needsNewVersion) {
      // A revision of an expired quote must carry a valid (future) validity date.
      if (validUntil.getTime() < Date.now()) {
        const v = validateValidUntil(body.validUntil);
        return NextResponse.json(
          { error: v.ok ? "Please provide a new valid-until date." : "This quotation has expired; please provide a new valid-until date." },
          { status: 400 }
        );
      }

      const nextVersion = (newest?.version ?? existing.version) + 1;
      let newQuotation: any = null;
      try {
        newQuotation = await Quotation.create({
          quotationId: existing.quotationId,
          projectId: existing.projectId,
          version: nextVersion,
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          taxPercentage: taxCheck.value,
          total: totals.total,
          validUntil,
          paymentTerms,
          deliveryTimeline,
          terms,
          notes,
          status: "DRAFT",
          createdBy: session.userId,
          previousAmount: existing.total,
          changeReason: str(body.changeReason) || "Revised scope & pricing based on feedback.",
        });
      } catch (err: any) {
        if (isDuplicateKeyError(err)) {
          return NextResponse.json({ error: "Another revision was just created. Please reload and try again." }, { status: 409 });
        }
        throw err;
      }

      await logActivity({
        userId: session.userId,
        role: "ADMIN",
        action: "QUOTATION_VERSION_CREATED",
        projectId: existing.projectId,
        entityId: existing.quotationId,
        entityType: "QUOTATION",
        description: `Admin created revised Version ${nextVersion} of ${existing.quotationId} (₹${existing.total.toLocaleString()} → ₹${totals.total.toLocaleString()}).`,
        metadata: {
          previousAmount: existing.total,
          newAmount: totals.total,
          version: nextVersion,
          reason: body.changeReason,
        },
      });

      if (body.sendImmediately) {
        newQuotation = (await dispatchQuotation(newQuotation._id.toString(), session.userId)) || newQuotation;
      }

      return NextResponse.json({
        success: true,
        message: body.sendImmediately
          ? `Version ${nextVersion} of the quotation was issued and sent to the student.`
          : `Version ${nextVersion} of the quotation was saved as a draft.`,
        quotation: newQuotation,
      });
    }

    // DRAFT: direct in-place update is permitted
    existing.items = items;
    existing.subtotal = totals.subtotal;
    existing.discount = totals.discount;
    existing.tax = totals.tax;
    existing.taxPercentage = taxCheck.value;
    existing.total = totals.total;
    existing.validUntil = validUntil;
    existing.paymentTerms = paymentTerms;
    existing.deliveryTimeline = deliveryTimeline;
    existing.terms = terms;
    existing.notes = notes;
    if (body.changeReason) existing.changeReason = str(body.changeReason);
    if (body.status !== undefined) {
      // A draft can only be kept as a draft or discarded; sending goes through /send.
      if (!["DRAFT", "CANCELLED"].includes(body.status)) {
        return NextResponse.json({ error: "A draft can only be saved as DRAFT or cancelled." }, { status: 400 });
      }
      existing.status = body.status;
    }

    await existing.save();

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "QUOTATION_UPDATED",
      projectId: existing.projectId,
      entityId: existing.quotationId,
      entityType: "QUOTATION",
      description: `Admin updated draft quotation ${existing.quotationId}.`,
    });

    let result: any = existing;
    if (body.sendImmediately && existing.status === "DRAFT") {
      result = (await dispatchQuotation(existing._id.toString(), session.userId)) || existing;
    }

    return NextResponse.json({
      success: true,
      message: body.sendImmediately ? "Quotation updated and sent to the student." : "Quotation updated successfully.",
      quotation: result,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
