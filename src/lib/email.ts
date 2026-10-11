import { escapeHtml } from "@/lib/validation";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Security-critical mail (e.g. password reset) is sent even when notification emails are switched off. */
  force?: boolean;
}

async function notificationEmailsEnabled(): Promise<boolean> {
  try {
    const { default: connectToDatabase } = await import("@/lib/db");
    const { Setting } = await import("@/models/Setting");
    await connectToDatabase();
    const settings = await Setting.findOne().select("notificationEmailEnabled").lean();
    return settings?.notificationEmailEnabled !== false;
  } catch {
    return true;
  }
}

export async function sendEmail({ to, subject, html, force = false }: EmailOptions): Promise<boolean> {
  if (!force && !(await notificationEmailsEnabled())) {
    console.log(`📪 Notification emails are disabled in settings; skipped "${subject}" to ${to}.`);
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith("re_demo")) {
    console.log(`\n📧 [EMAIL SIMULATION TO: ${to}]`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`);
    // Links live in href attributes (stripped above) - print them so flows like password reset work locally
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    if (links.length) console.log(`Links: ${links.join("  ")}`);
    console.log("");
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NexusDev Solutions <notifications@nexusdev.com>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.warn("Resend email failed:", err);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("Resend email error:", err.message);
    return false;
  }
}

// Modular Email Templates
export const EmailTemplates = {
  accountCreated: (name: string, email: string, tempPass: string, ambassadorId: string) => ({
    subject: "Welcome to Campus Ambassador Program - Your Account Details",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome, ${escapeHtml(name)}!</h2>
        <p>You have been registered as an official Campus Ambassador.</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p><strong>Ambassador ID:</strong> ${escapeHtml(ambassadorId)}</p>
          <p><strong>Login Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${escapeHtml(tempPass)}</code></p>
        </div>
        <p style="color: #dc2626;"><strong>Important:</strong> You must change this temporary password upon your first login.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/login" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Login to Student Portal</a></p>
      </div>
    `,
  }),

  projectSubmitted: (studentName: string, projectName: string, projectId: string) => ({
    subject: `Project Submitted Successfully - ${projectId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Project Received!</h2>
        <p>Dear ${escapeHtml(studentName)},</p>
        <p>Your project <strong>${escapeHtml(projectName)}</strong> (${escapeHtml(projectId)}) has been submitted and is currently <strong>Under Review</strong> by our technical team.</p>
        <p>Our architects will prepare a comprehensive quotation shortly.</p>
      </div>
    `,
  }),

  quotationSent: (clientName: string, projectName: string, quotationId: string, amount: number) => ({
    subject: `Official Quotation Ready - ${quotationId} for ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Quotation Prepared</h2>
        <p>Dear ${escapeHtml(clientName)},</p>
        <p>A formal quotation <strong>${escapeHtml(quotationId)}</strong> totaling <strong>₹${amount.toLocaleString()}</strong> has been generated for your project <strong>${escapeHtml(projectName)}</strong>.</p>
        <p>Please review and choose to Accept, Request Changes, or Reject through your portal.</p>
      </div>
    `,
  }),

  quotationAccepted: (adminName: string, projectName: string, quotationId: string) => ({
    subject: `Quotation Accepted! Project Approved - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #16a34a;">Quotation Accepted</h2>
        <p>Hello ${escapeHtml(adminName)},</p>
        <p>The student/client has accepted quotation <strong>${escapeHtml(quotationId)}</strong> for <strong>${escapeHtml(projectName)}</strong>. The project status has updated to <strong>APPROVED</strong>.</p>
      </div>
    `,
  }),

  changeRequested: (projectName: string, quotationId: string, reason: string) => ({
    subject: `Quotation Changes Requested - ${quotationId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ea580c;">Changes Requested</h2>
        <p>Changes were requested for quotation <strong>${escapeHtml(quotationId)}</strong> on project <strong>${escapeHtml(projectName)}</strong>.</p>
        <blockquote style="background: #f1f5f9; padding: 12px; border-left: 4px solid #ea580c;">${escapeHtml(reason)}</blockquote>
      </div>
    `,
  }),

  passwordReset: (name: string, resetUrl: string) => ({
    subject: "Reset your Campus Ambassador portal password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Password reset requested</h2>
        <p>Hello ${escapeHtml(name)},</p>
        <p>We received a request to reset your password. This link is valid for 30 minutes and can be used once.</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Choose a new password</a></p>
        <p style="color: #64748b; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  }),

  paymentReceived: (studentName: string, projectName: string, amount: number, remaining: number) => ({
    subject: `Payment Recorded - ₹${amount.toLocaleString()} for ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #16a34a;">Payment Confirmed</h2>
        <p>Dear ${escapeHtml(studentName)},</p>
        <p>A payment of <strong>₹${amount.toLocaleString()}</strong> has been recorded for project <strong>${escapeHtml(projectName)}</strong>.</p>
        <p>Remaining balance: <strong>₹${remaining.toLocaleString()}</strong>.</p>
      </div>
    `,
  }),
};
