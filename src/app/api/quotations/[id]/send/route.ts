import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { dispatchQuotation } from "@/lib/quotation";
import { isObjectId } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admin can send quotations." }, { status: 403 });
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }
    await connectToDatabase();

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found." }, { status: 404 });
    }

    // Only a draft can be sent. Anything else was already sent (use "Revise" to issue a new version).
    if (quotation.status !== "DRAFT") {
      return NextResponse.json(
        {
          error:
            quotation.status === "ACCEPTED"
              ? "This quotation has already been accepted and cannot be re-sent."
              : `Only draft quotations can be sent. This one is ${quotation.status}; issue a revised version instead.`,
        },
        { status: 400 }
      );
    }
    if (quotation.validUntil.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This draft's validity date has passed. Please revise it with a new valid-until date first." },
        { status: 400 }
      );
    }

    const sent = await dispatchQuotation(id, session.userId);

    return NextResponse.json({
      success: true,
      message: "Quotation sent successfully to student.",
      quotation: sent,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
