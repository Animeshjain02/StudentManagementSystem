import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const notif = await Notification.findOne({ _id: id, userId: session.userId });
    if (!notif) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    notif.isRead = true;
    await notif.save();

    return NextResponse.json({ success: true, notification: notif });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
