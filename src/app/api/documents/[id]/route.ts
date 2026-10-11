import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { ProjectDocument } from "@/models/Document";
import { Project } from "@/models/Project";
import { isObjectId } from "@/lib/validation";

/** Streams an uploaded project document. Admins can open any; students only their own projects'. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await connectToDatabase();
    const doc = await ProjectDocument.findById(id).select("+data");
    if (!doc || !doc.data) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (session.role === "STUDENT") {
      const project = await Project.findById(doc.projectId).select("studentId");
      if (!project || project.studentId.toString() !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const download = new URL(req.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(doc.data), {
      headers: {
        "Content-Type": doc.fileType,
        "Content-Length": String(doc.data.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.fileName.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
