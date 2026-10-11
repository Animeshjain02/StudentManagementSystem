import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { csvCell } from "@/lib/validation";

const isoDate = (d: unknown) => (d ? new Date(d as any).toISOString().split("T")[0] : "");

/**
 * Builds a CSV download. Every text cell is quoted/escaped and spreadsheet formulas (=, +, -, @)
 * are neutralised so user-entered values cannot execute when the file is opened in Excel/Sheets.
 * The BOM makes Excel read non-ASCII names (UTF-8) correctly.
 */
function csvResponse(filename: string, headers: string[], rows: unknown[][]) {
  const body = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  return new NextResponse("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

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
      const projects = await Project.find().sort({ createdAt: -1 }).populate("studentId", "name email");
      return csvResponse(
        "campus_projects_export.csv",
        [
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
        ],
        projects.map((p: any) => [
          p.projectId,
          p.projectName,
          p.studentId?.name || "N/A",
          p.clientName,
          p.clientEmail,
          p.collegeName,
          p.projectType,
          p.expectedBudget || 0,
          p.approvedBudget || 0,
          p.status,
          isoDate(p.createdAt),
        ])
      );
    }

    if (type === "payments") {
      const payments = await Payment.find().sort({ paymentDate: -1 }).populate("projectId", "projectId projectName");
      return csvResponse(
        "campus_payments_export.csv",
        ["Transaction Ref", "Project ID", "Project Name", "Amount (INR)", "Method", "Date", "Notes"],
        payments.map((pay: any) => [
          pay.transactionReference,
          pay.projectId?.projectId || "N/A",
          pay.projectId?.projectName || "N/A",
          pay.amount,
          pay.paymentMethod,
          isoDate(pay.paymentDate),
          pay.notes || "",
        ])
      );
    }

    if (type === "students") {
      const users = await User.find({ role: "STUDENT" }).sort({ createdAt: -1 });
      const profiles = await StudentProfile.find();
      const profMap = new Map(profiles.map((pr) => [pr.userId.toString(), pr]));

      return csvResponse(
        "campus_ambassadors_export.csv",
        ["Ambassador ID", "Full Name", "Email", "Phone", "College", "Branch", "Course", "Status", "Joined"],
        users.map((u) => {
          const pr = profMap.get(u._id.toString());
          return [
            pr?.ambassadorId || "N/A",
            u.name,
            u.email,
            pr?.phone || "N/A",
            pr?.collegeName || "N/A",
            pr?.branch || "N/A",
            pr?.course || "N/A",
            u.status,
            isoDate(pr?.joiningDate),
          ];
        })
      );
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (err: any) {
    return handleApiError(err);
  }
}
