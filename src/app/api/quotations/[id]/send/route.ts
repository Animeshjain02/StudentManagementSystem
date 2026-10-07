import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admin can send quotations." }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const quotation = await Quotation.findById(id).populate("projectId");
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    const project = quotation.projectId as any;
    quotation.status = "SENT";
    quotation.sentAt = new Date();
    await quotation.save();

    // Update project status to QUOTATION_SENT
    await Project.findByIdAndUpdate(project._id, { status: "QUOTATION_SENT" });

    // Student notification
    await createNotification({
      userId: project.studentId,
      title: "New Quotation Ready",
      message: `Quotation ${quotation.quotationId} (₹${quotation.total.toLocaleString()}) has been sent for project ${project.projectName}.`,
      type: "QUOTATION",
      relatedEntityId: quotation.quotationId,
      relatedEntityType: "QUOTATION",
    });

    // Send email to student
    const student = await User.findById(project.studentId);
    if (student) {
      const tmpl = EmailTemplates.quotationSent(student.name, project.projectName, quotation.quotationId, quotation.total);
      await sendEmail({ to: student.email, subject: tmpl.subject, html: tmpl.html });
    }

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "QUOTATION_SENT",
      projectId: project._id,
      entityId: quotation.quotationId,
      entityType: "QUOTATION",
      description: `Admin sent quotation ${quotation.quotationId} to student.`,
    });

    return NextResponse.json({
      success: true,
      message: "Quotation sent successfully to student.",
      quotation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
