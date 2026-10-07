import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation, IQuotationItem } from "@/models/Quotation";
import { Project } from "@/models/Project";
import { logActivity } from "@/lib/activity";
import { createNotification, notifyAdmins } from "@/lib/notification";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    const query: any = {};
    if (status) query.status = status;

    if (session.role === "STUDENT") {
      // Find all projects belonging to student
      const studentProjects = await Project.find({ studentId: session.userId }).select("_id");
      const projectIds = studentProjects.map((p) => p._id);
      query.projectId = { $in: projectIds };
    } else if (projectId) {
      query.projectId = projectId;
    }

    const quotations = await Quotation.find(query)
      .populate("projectId", "projectId projectName clientName clientEmail collegeName")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ quotations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const {
      projectId,
      items,
      discount = 0,
      taxPercentage = 18,
      validUntil,
      paymentTerms,
      deliveryTimeline,
      terms,
      notes,
      sendImmediately = false,
    } = body;

    if (!projectId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid project and at least one quotation line item." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Auto-calculate subtotal, discount, tax, total (RULE 14: Prevent manual manipulation)
    const processedItems: IQuotationItem[] = items.map((it: any) => ({
      description: it.description?.trim() || "Item",
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      amount: Math.max(1, Number(it.quantity) || 1) * Math.max(0, Number(it.unitPrice) || 0),
    }));

    const subtotal = processedItems.reduce((acc, it) => acc + it.amount, 0);
    const validDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
    const taxable = subtotal - validDiscount;
    const tax = Math.round((taxable * (Number(taxPercentage) || 18)) / 100);
    const total = taxable + tax;

    // Generate Quotation ID: QT-2026-XXXX
    const count = await Quotation.countDocuments();
    const year = new Date().getFullYear();
    const quotationId = `QT-${year}-${String(count + 1).padStart(4, "0")}`;

    const validityDate = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + 15 * 86400000);

    const quotation = await Quotation.create({
      quotationId,
      projectId: project._id,
      version: 1,
      items: processedItems,
      subtotal,
      discount: validDiscount,
      tax,
      total,
      validUntil: validityDate,
      paymentTerms:
        paymentTerms?.trim() ||
        "50% Advance on signing, 30% Milestone Demo, 20% on final handover.",
      deliveryTimeline: deliveryTimeline?.trim() || "30 to 45 Business Days",
      terms:
        terms?.trim() ||
        "1. All deliverables include 60 days of bug-fix warranty.\n2. Scope alterations subject to formal change order.",
      notes: notes?.trim() || "",
      status: sendImmediately ? "SENT" : "DRAFT",
      createdBy: session.userId,
      sentAt: sendImmediately ? new Date() : undefined,
    });

    if (sendImmediately) {
      project.status = "QUOTATION_SENT";
      await project.save();

      await createNotification({
        userId: project.studentId,
        title: "Official Quotation Received",
        message: `Quotation ${quotation.quotationId} for ${project.projectName} (Total: ₹${total.toLocaleString()}) has been sent for your review.`,
        type: "QUOTATION",
        relatedEntityId: quotation.quotationId,
        relatedEntityType: "QUOTATION",
      });
    } else {
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
      description: `Admin created quotation ${quotation.quotationId} (v1) totaling ₹${total.toLocaleString()}.`,
      metadata: { subtotal, discount: validDiscount, tax, total, status: quotation.status },
    });

    return NextResponse.json({
      success: true,
      message: "Quotation created successfully.",
      quotation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
