import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/server-student-dashboard";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isFresh = req.nextUrl.searchParams.get("fresh") === "true";
    const data = await getStudentDashboardData(session.userId, isFresh);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
