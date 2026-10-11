import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notifyAdmins } from "@/lib/notification";
import { sendEmail } from "@/lib/email";
import { User } from "@/models/User";
import { escapeHtml, str } from "@/lib/validation";
import { isRateLimited, recordHit } from "@/lib/rate-limit";

/** Support request from an ambassador: lands in every admin's notification centre (and inbox). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const subject = str(body?.subject);
    const message = str(body?.message);

    if (!subject || !message) {
      return NextResponse.json({ error: "Please provide both a subject and a message." }, { status: 400 });
    }
    if (subject.length > 150 || message.length > 3000) {
      return NextResponse.json({ error: "Subject (150) or message (3000 characters) is too long." }, { status: 400 });
    }

    const throttleKey = `support:${session.userId}`;
    if (isRateLimited(throttleKey, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "You have sent several requests recently. Please wait before sending another." }, { status: 429 });
    }
    recordHit(throttleKey);

    await connectToDatabase();

    await notifyAdmins({
      title: `Support request: ${subject}`,
      message: `${session.name} (${session.ambassadorId || session.email}): ${message.slice(0, 300)}`,
      type: "INFO",
      relatedEntityType: "STUDENT",
    });

    await logActivity({
      userId: session.userId,
      role: session.role,
      action: "SUPPORT_REQUEST",
      description: `${session.name} sent a support request: "${subject}".`,
    });

    const admins = await User.find({ role: "ADMIN", status: "ACTIVE" }).select("email");
    await Promise.all(
      admins.map((a) =>
        sendEmail({
          to: a.email,
          subject: `Support request from ${session.name}: ${subject}`,
          html: `<div style="font-family: Arial, sans-serif;"><p><strong>${escapeHtml(session.name)}</strong> (${escapeHtml(session.email)}) wrote:</p><blockquote>${escapeHtml(message).replace(/\n/g, "<br/>")}</blockquote></div>`,
        })
      )
    );

    return NextResponse.json({ success: true, message: "Your request has been sent to the program coordinators." });
  } catch (err: any) {
    return handleApiError(err);
  }
}
