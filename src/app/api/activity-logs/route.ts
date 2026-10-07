import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { ActivityLog } from "@/models/ActivityLog";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const role = searchParams.get("role");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: any = {};
    if (action) query.action = action;
    if (role) query.role = role;

    const logs = await ActivityLog.find(query)
      .populate("userId", "name email role")
      .populate("projectId", "projectId projectName")
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
