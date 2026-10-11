import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
import { ACTIONABLE_STATUSES, PRE_APPROVAL_STATUSES } from "@/lib/quotation";
import { isObjectId } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }
    await connectToDatabase();

    const found = await Quotation.findById(id).populate("projectId");
    if (!found || !found.sentAt) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const project = found.projectId as any;

    // Check authorization: Student ambassador who created the project, or student/admin session
    const isOwner = session && session.userId === project.studentId?.toString();
    const isStudent = session && session.role === "STUDENT";
    const isAdmin = session && session.role === "ADMIN";

    if (!isOwner && !isStudent && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only the student ambassador who created this project can accept this quotation." },
        { status: 403 }
      );
    }

    if (found.status === "ACCEPTED") {
      return NextResponse.json({ error: "This quotation has already been accepted." }, { status: 400 });
    }

    // RULE 3: Expiration check
    if (new Date() > new Date(found.validUntil)) {
      if (ACTIONABLE_STATUSES.includes(found.status)) {
        found.status = "EXPIRED";
        await found.save();
      }
      return NextResponse.json(
        { error: "This quotation has expired and can no longer be accepted. Please contact admin for a refreshed quotation." },
        { status: 400 }
      );
    }

    // Only a quotation that is currently awaiting the student's answer can be accepted
    // (not changes-requested, rejected, superseded by a newer version, ...).
    // The status check is part of the update so two concurrent clicks cannot both succeed.
    const quotation = await Quotation.findOneAndUpdate(
      { _id: found._id, status: { $in: ACTIONABLE_STATUSES } },
      { $set: { status: "ACCEPTED", acceptedAt: new Date() } },
      { new: true }
    );
    if (!quotation) {
      const reason: Record<string, string> = {
        CHANGES_REQUESTED: "You requested changes to this quotation; please wait for the revised version.",
        REJECTED: "This quotation was rejected and can no longer be accepted.",
        CANCELLED: "This quotation was superseded by a newer version. Please open the latest version.",
        EXPIRED: "This quotation has expired.",
      };
      return NextResponse.json(
        { error: reason[found.status] || "This quotation can no longer be accepted." },
        { status: 400 }
      );
    }

    // Approve the project and fix its budget (Requirement 17 & 21). A project that is already
    // in delivery (e.g. a change-order quotation) keeps its stage but gets the new budget.
    const update: Record<string, unknown> = { approvedBudget: quotation.total };
    if (PRE_APPROVAL_STATUSES.includes(project.status) || project.status === "REJECTED") {
      update.status = "APPROVED";
    }
    await Project.findByIdAndUpdate(project._id, update);

    // Record response
    await QuotationResponse.create({
      quotationId: quotation._id,
      version: quotation.version,
      action: "ACCEPTED",
      performedBy: session.userId,
    });

    // Activity Log
    await logActivity({
      userId: session.userId,
      role: "STUDENT",
      action: "QUOTATION_ACCEPTED",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `${session.name} accepted quotation ${quotation.quotationId} (v${quotation.version}) for ₹${quotation.total.toLocaleString()}. Project status set to APPROVED.`,
      metadata: { quotationId: quotation.quotationId, version: quotation.version, amount: quotation.total },
    });

    // Notify admins
    await notifyAdmins({
      title: `Quotation Accepted: ${quotation.quotationId}`,
      message: `${session.name} accepted quotation for project ${project.projectName}. The project is now APPROVED.`,
      type: "SUCCESS",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    // Email to admin
    const admin = await User.findOne({ role: "ADMIN" });
    if (admin) {
      const tmpl = EmailTemplates.quotationAccepted(admin.name, project.projectName, quotation.quotationId);
      await sendEmail({ to: admin.email, subject: tmpl.subject, html: tmpl.html });
    }

    return NextResponse.json({
      success: true,
      message: "Quotation accepted! The project has been officially APPROVED.",
      quotation,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
