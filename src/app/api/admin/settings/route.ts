import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Setting } from "@/models/Setting";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    await connectToDatabase();

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (body.companyName) settings.companyName = body.companyName;
    if (body.companyLogo) settings.companyLogo = body.companyLogo;
    if (body.companyAddress) settings.companyAddress = body.companyAddress;
    if (body.email) settings.email = body.email;
    if (body.phone) settings.phone = body.phone;
    if (body.taxPercentage !== undefined) settings.taxPercentage = Number(body.taxPercentage);
    if (body.defaultQuotationValidityDays !== undefined)
      settings.defaultQuotationValidityDays = Number(body.defaultQuotationValidityDays);
    if (body.defaultPaymentTerms) settings.defaultPaymentTerms = body.defaultPaymentTerms;
    if (body.notificationEmailEnabled !== undefined)
      settings.notificationEmailEnabled = Boolean(body.notificationEmailEnabled);

    await settings.save();

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "SETTINGS_UPDATED",
      description: "Admin updated company system settings.",
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully.", settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
