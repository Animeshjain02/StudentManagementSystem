import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Setting } from "@/models/Setting";
import { logActivity } from "@/lib/activity";
import { isEmail, num, str } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    // Company details appear on quotations/PDFs for both portals, but only signed-in users may read them
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    return NextResponse.json({ settings });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();

    // Validate everything up-front so a bad value never leaves the settings half-saved
    let taxPercentage: number | undefined;
    if (body.taxPercentage !== undefined) {
      taxPercentage = num(body.taxPercentage);
      if (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) {
        return NextResponse.json({ error: "Tax percentage must be between 0 and 100." }, { status: 400 });
      }
    }
    let validityDays: number | undefined;
    if (body.defaultQuotationValidityDays !== undefined) {
      validityDays = num(body.defaultQuotationValidityDays);
      if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 365) {
        return NextResponse.json({ error: "Default validity must be a whole number of days between 1 and 365." }, { status: 400 });
      }
    }
    if (body.email !== undefined && str(body.email) && !isEmail(body.email)) {
      return NextResponse.json({ error: "Please provide a valid company email address." }, { status: 400 });
    }

    await connectToDatabase();

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (str(body.companyName)) settings.companyName = str(body.companyName);
    if (str(body.companyLogo)) settings.companyLogo = str(body.companyLogo);
    if (str(body.companyAddress)) settings.companyAddress = str(body.companyAddress);
    if (str(body.email)) settings.email = str(body.email);
    if (str(body.phone)) settings.phone = str(body.phone);
    if (taxPercentage !== undefined) settings.taxPercentage = taxPercentage;
    if (validityDays !== undefined) settings.defaultQuotationValidityDays = validityDays;
    if (str(body.defaultPaymentTerms)) settings.defaultPaymentTerms = str(body.defaultPaymentTerms);
    if (typeof body.notificationEmailEnabled === "boolean")
      settings.notificationEmailEnabled = body.notificationEmailEnabled;

    await settings.save();

    await logActivity({
      userId: session.userId,
      role: "ADMIN",
      action: "SETTINGS_UPDATED",
      description: "Admin updated company system settings.",
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully.", settings });
  } catch (err: any) {
    return handleApiError(err);
  }
}
