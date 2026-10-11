import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { createResetToken } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { sendEmail, EmailTemplates } from "@/lib/email";
import { isRateLimited, recordHit } from "@/lib/rate-limit";
import { isEmail, str } from "@/lib/validation";

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = str(body?.email).toLowerCase();

    if (!isEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Limit reset emails per address so the endpoint cannot be used to spam someone's inbox
    const throttleKey = `forgot:${email}`;
    if (isRateLimited(throttleKey, 3, 15 * 60 * 1000)) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }
    recordHit(throttleKey);

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (user && user.status === "ACTIVE") {
      const token = await createResetToken(user._id.toString(), user.passwordHash);
      const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
      const tmpl = EmailTemplates.passwordReset(user.name, `${base}/reset-password?token=${encodeURIComponent(token)}`);
      await sendEmail({ to: user.email, subject: tmpl.subject, html: tmpl.html, force: true });
    }

    // Identical response whether or not the account exists (no account enumeration)
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (err: any) {
    return handleApiError(err);
  }
}
