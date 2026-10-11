import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { QuotationResponse } from "@/models/QuotationResponse";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { isObjectId, str } from "@/lib/validation";

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
    const body = await req.json();
    await connectToDatabase();

    const reason = str(body.reason || body.changes || "");
    if (!reason) {
      return NextResponse.json(
        { error: "Please provide a reason or modification request." },
        { status: 400 }
      );
    }

    let project = null;
    if (isObjectId(id)) {
      project = await Project.findById(id);
    } else {
      project = await Project.findOne({ projectId: id });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Get the student ambassador who created the project
    const ambassador = await User.findById(project.studentId);
    const ambassadorName = ambassador?.name || session?.name || "Student Ambassador";
    const ambassadorId = ambassador?._id || project.studentId;

    // Check authorization:
    const isOwner = session && session.userId === project.studentId.toString();
    const isStudent = session && session.role === "STUDENT";
    const isAdmin = session && session.role === "ADMIN";
    const isDevelopmentMode = process.env.DISABLE_AUTH === "true";

    if (!isOwner && !isStudent && !isAdmin && !isDevelopmentMode) {
      return NextResponse.json(
        { error: "Forbidden: Only the student ambassador who created this project can decline or request adjustments." },
        { status: 403 }
      );
    }

    // Update status to CHANGES_REQUESTED
    project.status = "CHANGES_REQUESTED";
    await project.save();

    // If an active quotation exists, update it as well
    const actionableQuotation = await Quotation.findOne({
      projectId: project._id,
      status: { $in: ["SENT", "VIEWED"] },
    }).sort({ createdAt: -1 });

    if (actionableQuotation) {
      actionableQuotation.status = "CHANGES_REQUESTED";
      actionableQuotation.requestedChanges = reason;
      await actionableQuotation.save();

      await QuotationResponse.create({
        quotationId: actionableQuotation._id,
        version: actionableQuotation.version,
        action: "CHANGES_REQUESTED",
        comment: reason,
        performedBy: ambassadorId,
      });
    }

    // Log Activity attributed to student ambassador
    await logActivity({
      userId: ambassadorId,
      role: "STUDENT",
      action: "BUDGET_DECLINED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `${ambassadorName} (Student Ambassador) requested changes to proposed budget: "${reason}"`,
      metadata: { reason, quotationId: actionableQuotation?.quotationId, requestedBy: ambassadorName },
    });

    // Notify all Admins in real-time
    await notifyAdmins({
      title: `Budget Adjustment Requested: ${project.projectName}`,
      message: `Student Ambassador ${ambassadorName} declined the proposed budget or requested adjustments: "${reason}". Please review and provide a revised proposal.`,
      type: "ALERT",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted. Admin has been notified and will provide an updated proposal.",
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
