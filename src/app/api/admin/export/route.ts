import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "projects";

    await connectToDatabase();

    if (type === "projects") {
      const projects = await Project.find().populate("studentId", "name email");
      const headers = [
        "Project ID",
        "Project Name",
        "Ambassador",
        "Client Name",
        "Client Email",
        "College",
        "Type",
        "Expected Budget (INR)",
        "Approved Budget (INR)",
        "Status",
        "Created Date",
      ];

      const rows = projects.map((p: any) => [
        `"${p.projectId}"`,
        `"${p.projectName?.replace(/"/g, '""')}"`,
        `"${p.studentId?.name || "N/A"}"`,
        `"${p.clientName?.replace(/"/g, '""')}"`,
        `"${p.clientEmail}"`,
        `"${p.collegeName?.replace(/"/g, '""')}"`,
        `"${p.projectType}"`,
        p.expectedBudget || 0,
        p.approvedBudget || 0,
        `"${p.status}"`,
        `"${new Date(p.createdAt).toISOString().split("T")[0]}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="campus_projects_export.csv"',
        },
      });
    }

    if (type === "payments") {
      const payments = await Payment.find().populate("projectId", "projectId projectName");
      const headers = ["Transaction Ref", "Project ID", "Project Name", "Amount (INR)", "Method", "Date", "Notes"];

      const rows = payments.map((pay: any) => [
        `"${pay.transactionReference}"`,
        `"${pay.projectId?.projectId || "N/A"}"`,
        `"${pay.projectId?.projectName?.replace(/"/g, '""') || "N/A"}"`,
        pay.amount,
        `"${pay.paymentMethod}"`,
        `"${new Date(pay.paymentDate).toISOString().split("T")[0]}"`,
        `"${pay.notes?.replace(/"/g, '""') || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="campus_payments_export.csv"',
        },
      });
    }

    if (type === "students") {
      const users = await User.find({ role: "STUDENT" });
      const profiles = await StudentProfile.find();
      const profMap = new Map(profiles.map((pr) => [pr.userId.toString(), pr]));

      const headers = ["Ambassador ID", "Full Name", "Email", "Phone", "College", "Branch", "Course", "Status", "Joined"];
      const rows = users.map((u) => {
        const pr = profMap.get(u._id.toString());
        return [
          `"${pr?.ambassadorId || "N/A"}"`,
          `"${u.name}"`,
          `"${u.email}"`,
          `"${pr?.phone || "N/A"}"`,
          `"${pr?.collegeName || "N/A"}"`,
          `"${pr?.branch || "N/A"}"`,
          `"${pr?.course || "N/A"}"`,
          `"${u.status}"`,
          `"${pr?.joiningDate ? new Date(pr.joiningDate).toISOString().split("T")[0] : ""}"`,
        ];
      });

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="campus_ambassadors_export.csv"',
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
