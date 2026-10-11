import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Payment, PAYMENT_METHODS } from "@/models/Payment";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
import { isObjectId, num, parseDate, str } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let query: any = {};
    if (projectId) {
      if (!isObjectId(projectId)) {
        return NextResponse.json({ error: "Invalid project reference." }, { status: 400 });
      }
      query.projectId = projectId;
    }

    if (session.role === "STUDENT") {
      const studentProjects = await Project.find({ studentId: session.userId }).select("_id").lean();
      const projectIds = studentProjects.map((p: any) => p._id);
      query.projectId = projectId
        ? { $in: projectIds.filter((pid: any) => pid.toString() === projectId) }
        : { $in: projectIds };
    }

    const payments = await Payment.find(query)
      .select("projectId amount paymentDate paymentMethod transactionReference receiptUrl notes createdAt")
      .populate("projectId", "projectId projectName clientName collegeName expectedBudget approvedBudget status studentId")
      .populate("createdBy", "name email")
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ payments });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession("ADMIN");
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin is authorized to record payments." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      projectId,
      amount,
      paymentDate,
      paymentMethod,
      transactionReference,
      receiptUrl,
      notes,
    } = body;

    const reference = str(transactionReference) || `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!projectId || amount === undefined || amount === "" || !paymentDate || !paymentMethod) {
      return NextResponse.json(
        { error: "Please provide all required payment details: Project, Amount, Payment Method, and Date." },
        { status: 400 }
      );
    }
    if (!isObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid project reference." }, { status: 400 });
    }

    const payAmount = num(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number." },
        { status: 400 }
      );
    }
    if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
    }
    const paidOn = parseDate(paymentDate);
    if (!paidOn) {
      return NextResponse.json({ error: "Invalid payment date." }, { status: 400 });
    }

    await connectToDatabase();
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const effectiveBudget = project.approvedBudget || project.expectedBudget || 0;
    const existingPayments = await Payment.find({ projectId: project._id });
    const currentPaid = existingPayments.reduce((acc, p) => acc + p.amount, 0);
    const pendingBalance = Math.max(0, effectiveBudget - currentPaid);

    // RULE 24: A payment can never exceed the remaining balance (and nothing more can be
    // recorded once the project is fully paid).
    if (effectiveBudget <= 0) {
      return NextResponse.json(
        { error: "This project has no approved budget yet. Send a quotation and wait for the ambassador to accept it before recording payments." },
        { status: 400 }
      );
    }
    if (pendingBalance <= 0) {
      return NextResponse.json(
        { error: "This project is already fully paid; no further payments can be recorded." },
        { status: 400 }
      );
    }
    if (payAmount > pendingBalance) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${payAmount.toLocaleString()}) exceeds the pending balance of ₹${pendingBalance.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }
    if (str(transactionReference) && existingPayments.some((p) => p.transactionReference.toLowerCase() === reference.toLowerCase())) {
      return NextResponse.json(
        { error: "A payment with this transaction reference has already been recorded for this project." },
        { status: 409 }
      );
    }

    const payment = await Payment.create({
      projectId: project._id,
      amount: payAmount,
      paymentDate: paidOn,
      paymentMethod,
      transactionReference: reference,
      receiptUrl: str(receiptUrl),
      notes: str(notes),
      createdBy: session.userId,
    });

    const newTotalPaid = currentPaid + payAmount;
    const newRemaining = Math.max(0, effectiveBudget - newTotalPaid);

    // If fully paid and delivered, can update to COMPLETED
    if (newRemaining === 0 && project.status === "DELIVERED") {
      project.status = "COMPLETED";
      await project.save();
    } else if (newRemaining === 0 && project.status === "PAYMENT_PENDING") {
      project.status = "COMPLETED";
      await project.save();
    }

    // Activity Log
    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "PAYMENT_RECORDED",
      projectId: project._id,
      entityId: payment._id.toString(),
      entityType: "PAYMENT",
      description: `Payment of ₹${payAmount.toLocaleString()} recorded for project ${project.projectId} via ${paymentMethod}.`,
      metadata: { amount: payAmount, method: paymentMethod, transactionReference: reference, remaining: newRemaining },
    });

    // In-app Notification for student
    await createNotification({
      userId: project.studentId,
      title: "Payment Received",
      message: `A payment of ₹${payAmount.toLocaleString()} has been confirmed for ${project.projectName}. Pending balance: ₹${newRemaining.toLocaleString()}.`,
      type: "PAYMENT",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    // Email to student
    const student = await User.findById(project.studentId);
    if (student) {
      const tmpl = EmailTemplates.paymentReceived(student.name, project.projectName, payAmount, newRemaining);
      await sendEmail({ to: student.email, subject: tmpl.subject, html: tmpl.html });
    }

    // Invalidate caches for instant real-time sync
    const { invalidateStudentDashboardCache } = await import("@/lib/server-student-dashboard");
    const { invalidateAdminAnalyticsCache } = await import("@/lib/server-admin-analytics");
    invalidateStudentDashboardCache();
    invalidateAdminAnalyticsCache();

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully.",
      payment,
      financials: {
        totalBudget: effectiveBudget,
        totalPaid: newTotalPaid,
        pendingPayment: newRemaining,
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
