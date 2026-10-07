import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();

    const [users, profiles, projects, quotations, payments] = await Promise.all([
      User.find({ role: "STUDENT" }),
      StudentProfile.find(),
      Project.find().populate("studentId", "name email"),
      Quotation.find(),
      Payment.find(),
    ]);

    // Summary counts
    const totalAmbassadors = users.length;
    const activeAmbassadors = users.filter((u) => u.status === "ACTIVE").length;

    const totalProjects = projects.length;
    const newProjects = projects.filter((p) => p.status === "SUBMITTED").length;
    const projectsUnderReview = projects.filter((p) =>
      ["UNDER_REVIEW", "REQUIREMENT_CLARIFICATION"].includes(p.status)
    ).length;
    const quotationsPending = projects.filter((p) =>
      ["QUOTATION_PREPARATION", "QUOTATION_SENT", "AWAITING_APPROVAL", "CHANGES_REQUESTED"].includes(p.status)
    ).length;
    const approvedProjects = projects.filter((p) => p.status === "APPROVED").length;
    const workingProjects = projects.filter((p) => ["ASSIGNED", "WORKING", "TESTING", "CLIENT_REVIEW"].includes(p.status)).length;
    const deliveredProjects = projects.filter((p) => ["READY_FOR_DELIVERY", "DELIVERED"].includes(p.status)).length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

    // Financials
    const totalProjectValue = projects.reduce(
      (acc, p) => acc + (p.approvedBudget || p.expectedBudget || 0),
      0
    );
    const totalPaymentReceived = payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingPayment = Math.max(0, totalProjectValue - totalPaymentReceived);

    // Projects by Status
    const statusCounts: Record<string, number> = {};
    projects.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    const projectsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Projects by Type
    const typeCounts: Record<string, number> = {};
    projects.forEach((p) => {
      typeCounts[p.projectType] = (typeCounts[p.projectType] || 0) + 1;
    });
    const projectsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    // College-wise projects
    const collegeCounts: Record<string, number> = {};
    projects.forEach((p) => {
      const col = p.collegeName || "Unknown";
      collegeCounts[col] = (collegeCounts[col] || 0) + 1;
    });
    const collegeWiseProjects = Object.entries(collegeCounts)
      .map(([college, count]) => ({ college, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Ambassador Performance Table (Requirement 26)
    const ambassadorMap: Record<string, any> = {};
    profiles.forEach((pr) => {
      ambassadorMap[pr.userId.toString()] = {
        userId: pr.userId.toString(),
        ambassadorId: pr.ambassadorId,
        collegeName: pr.collegeName,
        name: "Ambassador",
        submitted: 0,
        approved: 0,
        working: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        totalValue: 0,
        totalRevenue: 0,
      };
    });

    users.forEach((u) => {
      if (ambassadorMap[u._id.toString()]) {
        ambassadorMap[u._id.toString()].name = u.name;
      }
    });

    projects.forEach((p) => {
      const sId = (p.studentId as any)?._id?.toString() || p.studentId?.toString();
      if (ambassadorMap[sId]) {
        ambassadorMap[sId].submitted++;
        const val = p.approvedBudget || p.expectedBudget || 0;
        ambassadorMap[sId].totalValue += val;

        if (["APPROVED", "WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(p.status)) {
          ambassadorMap[sId].approved++;
        }
        if (["WORKING", "TESTING", "CLIENT_REVIEW"].includes(p.status)) {
          ambassadorMap[sId].working++;
        }
        if (p.status === "COMPLETED") {
          ambassadorMap[sId].completed++;
        }
        if (p.status === "REJECTED") {
          ambassadorMap[sId].rejected++;
        }
        if (p.status === "CANCELLED") {
          ambassadorMap[sId].cancelled++;
        }
      }
    });

    // Add revenues
    payments.forEach((pay) => {
      const proj = projects.find((p) => p._id.toString() === pay.projectId.toString());
      if (proj) {
        const sId = (proj.studentId as any)?._id?.toString() || proj.studentId?.toString();
        if (ambassadorMap[sId]) {
          ambassadorMap[sId].totalRevenue += pay.amount;
        }
      }
    });

    const topAmbassadors = Object.values(ambassadorMap).map((a: any) => ({
      ...a,
      conversionRate: a.submitted > 0 ? Math.round((a.approved / a.submitted) * 100) : 0,
      pendingPayment: Math.max(0, a.totalValue - a.totalRevenue),
    }));

    return NextResponse.json({
      cards: {
        totalAmbassadors,
        activeAmbassadors,
        totalProjects,
        newProjects,
        projectsUnderReview,
        quotationsPending,
        approvedProjects,
        workingProjects,
        deliveredProjects,
        completedProjects,
        totalProjectValue,
        totalPaymentReceived,
        pendingPayment,
      },
      charts: {
        projectsByStatus,
        projectsByType,
        collegeWiseProjects,
      },
      topAmbassadors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
