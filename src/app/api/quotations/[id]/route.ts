import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation, IQuotationItem } from "@/models/Quotation";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";

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

    let quotation = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
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

    // Security check: if student, project must belong to student
    if (session.role === "STUDENT" && project.studentId.toString() !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this quotation." },
        { status: 403 }
      );
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

    // Fetch version history if available
    const versionHistory = await Quotation.find({ quotationId: quotation.quotationId })
      .sort({ version: 1 })
      .select("version total status createdAt changeReason previousAmount");

    return NextResponse.json({
      quotation,
      project,
      versionHistory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const body = await req.json();
    await connectToDatabase();

    const existingQuotation = await Quotation.findById(id);
    if (!existingQuotation) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    if (existingQuotation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Cannot modify an accepted quotation. Preserving accepted agreement." },
        { status: 400 }
      );
    }

    // Auto calculate new totals
    const items: IQuotationItem[] = (body.items || existingQuotation.items).map((it: any) => ({
      description: it.description?.trim() || "Item",
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      amount: Math.max(1, Number(it.quantity) || 1) * Math.max(0, Number(it.unitPrice) || 0),
    }));

    const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
    const discount = Math.min(subtotal, Math.max(0, Number(body.discount ?? existingQuotation.discount)));
    const taxable = subtotal - discount;
    const taxPercentage = body.taxPercentage ?? 18;
    const tax = Math.round((taxable * taxPercentage) / 100);
    const total = taxable + tax;

    // QUOTATION VERSIONING (Requirement 20)
    // If the quotation has already been SENT, VIEWED, or CHANGES_REQUESTED, create a new version!
    const needsNewVersion = ["SENT", "VIEWED", "CHANGES_REQUESTED"].includes(existingQuotation.status);

    if (needsNewVersion) {
      // Mark old version as superseded/archived if needed, create new version document
      const nextVersion = existingQuotation.version + 1;
      const newQuotation = await Quotation.create({
        quotationId: existingQuotation.quotationId,
        projectId: existingQuotation.projectId,
        version: nextVersion,
        items,
        subtotal,
        discount,
        tax,
        total,
        validUntil: body.validUntil ? new Date(body.validUntil) : existingQuotation.validUntil,
        paymentTerms: body.paymentTerms || existingQuotation.paymentTerms,
        deliveryTimeline: body.deliveryTimeline || existingQuotation.deliveryTimeline,
        terms: body.terms || existingQuotation.terms,
        notes: body.notes !== undefined ? body.notes : existingQuotation.notes,
        status: body.sendImmediately ? "SENT" : "DRAFT",
        createdBy: session.userId,
        sentAt: body.sendImmediately ? new Date() : undefined,
        previousAmount: existingQuotation.total,
        changeReason: body.changeReason || "Revised scope & pricing based on feedback.",
      });

      // Update project status if sent
      if (body.sendImmediately) {
        await Project.findByIdAndUpdate(existingQuotation.projectId, { status: "QUOTATION_SENT" });
        const proj = await Project.findById(existingQuotation.projectId);
        if (proj) {
          await createNotification({
            userId: proj.studentId,
            title: `Quotation Updated (v${nextVersion})`,
            message: `A revised quotation (${existingQuotation.quotationId} v${nextVersion}) for ₹${total.toLocaleString()} is available.`,
            type: "QUOTATION",
            relatedEntityId: existingQuotation.quotationId,
            relatedEntityType: "QUOTATION",
          });
        }
      }

      await logActivity({
        userId: session.userId,
        role: "ADMIN",
        action: "QUOTATION_VERSION_CREATED",
        projectId: existingQuotation.projectId,
        entityId: existingQuotation.quotationId,
        entityType: "QUOTATION",
        description: `Admin created revised Version ${nextVersion} of ${existingQuotation.quotationId} (₹${existingQuotation.total.toLocaleString()} → ₹${total.toLocaleString()}).`,
        metadata: {
          previousAmount: existingQuotation.total,
          newAmount: total,
          version: nextVersion,
          reason: body.changeReason,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Version ${nextVersion} of quotation created successfully!`,
        quotation: newQuotation,
      });
    } else {
      // In DRAFT mode, direct update is permitted
      existingQuotation.items = items;
      existingQuotation.subtotal = subtotal;
      existingQuotation.discount = discount;
      existingQuotation.tax = tax;
      existingQuotation.total = total;
      if (body.validUntil) existingQuotation.validUntil = new Date(body.validUntil);
      if (body.paymentTerms) existingQuotation.paymentTerms = body.paymentTerms;
      if (body.deliveryTimeline) existingQuotation.deliveryTimeline = body.deliveryTimeline;
      if (body.terms) existingQuotation.terms = body.terms;
      if (body.notes !== undefined) existingQuotation.notes = body.notes;
      if (body.status) existingQuotation.status = body.status;

      await existingQuotation.save();

      await logActivity({
        userId: session.userId,
        role: "ADMIN",
        action: "QUOTATION_UPDATED",
        projectId: existingQuotation.projectId,
        entityId: existingQuotation.quotationId,
        entityType: "QUOTATION",
        description: `Admin updated draft quotation ${existingQuotation.quotationId}.`,
      });

      return NextResponse.json({
        success: true,
        message: "Quotation updated successfully.",
        quotation: existingQuotation,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
