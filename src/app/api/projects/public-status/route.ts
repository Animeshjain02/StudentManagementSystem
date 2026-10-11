import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { isObjectId } from "@/lib/validation";
import { generateTrackingHash, isTrackingHash } from "@/lib/tracking-hash";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParam = (
      searchParams.get("query") ||
      searchParams.get("projectId") ||
      searchParams.get("id") ||
      ""
    ).trim();

    if (!rawParam) {
      return NextResponse.json(
        { error: "Please provide a valid Project ID or Tracking Hash." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedHash = rawParam.toLowerCase();

    // 1. Check direct match by trackingHash, raw projectId, or _id
    let project = await Project.findOne({
      $or: [
        { trackingHash: normalizedHash },
        { projectId: { $regex: new RegExp(`^${rawParam}$`, "i") } },
        ...(isObjectId(rawParam) ? [{ _id: rawParam }] : []),
      ],
    });

    // 2. If not found and input might be a tracking hash, check against generated hash of projects
    if (!project) {
      const allProjects = await Project.find({}, "projectId trackingHash").lean();
      const matched = allProjects.find(
        (p) => generateTrackingHash(p.projectId).toLowerCase() === normalizedHash
      );
      if (matched) {
        project = await Project.findById(matched._id);
      }
    }

    // 3. If still not found and input might be a raw projectId, compute its hash
    if (!project && !isTrackingHash(rawParam)) {
      const computed = generateTrackingHash(rawParam);
      project = await Project.findOne({ trackingHash: computed });
    }

    if (!project) {
      return NextResponse.json(
        { error: `No project found matching "${rawParam}". Please verify your Tracking details.` },
        { status: 404 }
      );
    }

    // Ensure trackingHash is persisted on the document
    const trackingHash = project.trackingHash || generateTrackingHash(project.projectId);
    if (!project.trackingHash) {
      project.trackingHash = trackingHash;
      await project.save().catch(() => {});
    }

    // STRICT SANITIZATION:
    // Only return non-sensitive status and timeline information.
    // Absolutely NO amounts, budgets, quotations, payments, or client contact details.
    return NextResponse.json({
      success: true,
      project: {
        trackingHash,
        projectId: project.projectId,
        projectName: project.projectName,
        projectType: project.projectType,
        department: project.department || "Engineering",
        collegeName: project.collegeName || "",
        status: project.status,
        expectedDeliveryDate: project.expectedDeliveryDate || null,
        actualDeliveryDate: project.actualDeliveryDate || null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Public project tracking error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project status. Please try again later." },
      { status: 500 }
    );
  }
}
