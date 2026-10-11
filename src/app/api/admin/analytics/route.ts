import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/server-admin-analytics";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const isFresh = req.nextUrl.searchParams.get("fresh") === "true";
    const data = await getAdminAnalytics(isFresh);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
