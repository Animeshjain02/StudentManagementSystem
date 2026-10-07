import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    await runSeed();
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with Admin, 10 Ambassadors, 20 Projects, Quotations, Milestones, and Payments!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
