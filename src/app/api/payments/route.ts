import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";

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
      query.projectId = projectId;
    }

    if (session.role === "STUDENT") {
      const studentProjects = await Project.find({ studentId: session.userId }).select("_id");
      const projectIds = studentProjects.map((p) => p._id);
      query.projectId = { $in: projectIds };
    }

    const payments = await Payment.find(query)
      .populate("projectId", "projectId projectName clientName collegeName expectedBudget approvedBudget status studentId")
      .populate("createdBy", "name email")
      .sort({ paymentDate: -1 });

    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
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

    if (!projectId || !amount || !paymentDate || !paymentMethod || !transactionReference) {
      return NextResponse.json(
        { error: "Please provide all required payment details." },
        { status: 400 }
      );
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number." },
        { status: 400 }
      );
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

    // RULE 24: Prevent payment amount from exceeding remaining balance
    if (payAmount > pendingBalance && pendingBalance > 0) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${payAmount.toLocaleString()}) exceeds the pending balance of ₹${pendingBalance.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    const payment = await Payment.create({
      projectId: project._id,
      amount: payAmount,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      transactionReference: transactionReference.trim(),
      receiptUrl: receiptUrl?.trim() || "",
      notes: notes?.trim() || "",
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
      metadata: { amount: payAmount, method: paymentMethod, transactionReference, remaining: newRemaining },
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
