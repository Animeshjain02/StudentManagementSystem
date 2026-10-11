import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project, PROJECT_TYPES, ProjectStatus } from "@/models/Project";
import { StudentProfile } from "@/models/StudentProfile";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification, notifyAdmins } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";
import {
  escapeRegex,
  isDuplicateKeyError,
  isEmail,
  isObjectId,
  nextSequentialId,
  num,
  parsePagination,
  str,
} from "@/lib/validation";
import { PROJECT_STATUSES } from "@/lib/constants";
import { ProjectDocument } from "@/models/Document";
import { validatePdfFile, validateProjectFields, generateProjectId } from "@/lib/field-rules";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const projectType = searchParams.get("projectType") || "";
    const college = searchParams.get("college") || "";
    const { page, limit, skip } = parsePagination(searchParams);

    const query: any = {};

    // RULE 8: Student can ONLY see their own projects
    if (session.role === "STUDENT") {
      query.studentId = session.userId;
    }

    if (status) {
      // Accepts a single status or a comma-separated list (e.g. "QUOTATION_SENT,AWAITING_APPROVAL")
      const statuses = status.split(",").map((x) => x.trim()).filter((x) => (PROJECT_STATUSES as readonly string[]).includes(x));
      query.status = { $in: statuses };
    }
    if (projectType) query.projectType = projectType;
    if (college) query.collegeName = college;

    if (search) {
      const qRegex = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: "i" };
      query.$or = [
        { projectId: qRegex },
        { projectName: qRegex },
        { clientName: qRegex },
        { collegeName: qRegex },
      ];
    }

    const [total, projects] = await Promise.all([
      Project.countDocuments(query),
      Project.find(query)
        .select("projectId projectName clientName clientEmail clientPhone collegeName department projectType expectedBudget approvedBudget status source isDirect createdAt")
        .populate("studentId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accepts JSON (API clients) or multipart/form-data (the web form, which can attach a PDF)
    let body: Record<string, any>;
    let upload: File | null = null;
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const form = await req.formData();
      body = {};
      form.forEach((value, key) => {
        if (typeof value === "string") body[key] = value;
      });
      const file = form.get("document");
      if (file instanceof File && file.size > 0) upload = file;
    } else {
      body = await req.json();
    }

    const {
      projectType,
      expectedBudget,
      approvedBudget: rawApprovedBudget,
      studentId: overrideStudentId, // only allowed for Admin
    } = body;

    const fields = {
      projectName: str(body.projectName),
      clientName: str(body.clientName),
      clientEmail: str(body.clientEmail).toLowerCase(),
      clientPhone: str(body.clientPhone),
      collegeName: str(body.collegeName),
      department: str(body.department),
      projectType: str(projectType),
      description: str(body.description),
      functionalRequirements: str(body.functionalRequirements),
      technicalRequirements: str(body.technicalRequirements),
      expectedFeatures: str(body.expectedFeatures),
      referenceLinks: str(body.referenceLinks),
    };

    const problems = validateProjectFields(fields, PROJECT_TYPES);
    const firstProblem = Object.values(problems)[0];
    if (firstProblem) {
      return NextResponse.json({ error: firstProblem, fieldErrors: problems }, { status: 400 });
    }

    // Budget is optional now (the admin prices the project via a quotation) but must be sane if supplied
    let budget = 0;
    if (expectedBudget !== undefined && expectedBudget !== null && expectedBudget !== "") {
      budget = num(expectedBudget);
      if (!Number.isFinite(budget) || budget < 0) {
        return NextResponse.json({ error: "Expected budget must be a non-negative number." }, { status: 400 });
      }
    }

    let parsedApprovedBudget: number | undefined = undefined;
    if (rawApprovedBudget !== undefined && rawApprovedBudget !== null && rawApprovedBudget !== "") {
      const parsed = num(rawApprovedBudget);
      if (Number.isFinite(parsed) && parsed >= 0) {
        parsedApprovedBudget = parsed;
      }
    }

    let pdf: { buffer: Buffer; name: string } | null = null;
    if (upload) {
      const fileProblem = validatePdfFile({ name: upload.name, size: upload.size, type: upload.type });
      if (fileProblem) {
        return NextResponse.json({ error: fileProblem, fieldErrors: { document: fileProblem } }, { status: 400 });
      }
      const buffer = Buffer.from(await upload.arrayBuffer());
      // Trust the contents, not the file name / declared type
      if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
        const msg = "The uploaded file is not a valid PDF.";
        return NextResponse.json({ error: msg, fieldErrors: { document: msg } }, { status: 400 });
      }
      pdf = { buffer, name: upload.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document.pdf" };
    }

    await connectToDatabase();

    let targetStudentId = session.userId;
    if (session.role === "ADMIN" && overrideStudentId) {
      if (!isObjectId(overrideStudentId)) {
        return NextResponse.json({ error: "Invalid student reference." }, { status: 400 });
      }
      targetStudentId = overrideStudentId;
    }

    const studentUser = await User.findById(targetStudentId);
    if (!studentUser) {
      return NextResponse.json({ error: "Associated student not found." }, { status: 404 });
    }

    const studentProfile = await StudentProfile.findOne({ userId: targetStudentId });

    const year = new Date().getFullYear();
    const isDirectProject =
      session.role === "ADMIN" &&
      (body.source === "DIRECT" || body.isDirect === "true" || body.isDirect === true || !overrideStudentId);
    const source = isDirectProject ? "DIRECT" : "AMBASSADOR";

    const finalApprovedBudget =
      parsedApprovedBudget !== undefined
        ? parsedApprovedBudget
        : (isDirectProject && budget > 0 ? budget : undefined);

    const finalExpectedBudget = budget > 0 ? budget : (finalApprovedBudget || 0);

    const data: any = {
      studentId: targetStudentId,
      source,
      isDirect: isDirectProject,
      projectName: fields.projectName,
      clientName: fields.clientName,
      clientEmail: fields.clientEmail,
      clientPhone: fields.clientPhone || studentProfile?.phone || "",
      collegeName: fields.collegeName || studentProfile?.collegeName || "N/A",
      department: fields.department || studentProfile?.branch || "N/A",
      projectType: fields.projectType,
      description: fields.description,
      requirements: {
        functionalRequirements: fields.functionalRequirements,
        technicalRequirements: fields.technicalRequirements,
        expectedFeatures: fields.expectedFeatures,
        referenceLinks: fields.referenceLinks,
      },
      expectedBudget: finalExpectedBudget,
      status: "SUBMITTED",
      assignedTeam: [],
    };

    if (finalApprovedBudget !== undefined && finalApprovedBudget > 0) {
      data.approvedBudget = finalApprovedBudget;
    }

    // Project ID assignment:
    // If client form provided an auto-generated projectId (e.g. ACEIT-CS-8976), use it.
    // If not provided and college/department/phone are available, generate it.
    // Otherwise fallback to PRJ-YYYY-NNNNN sequential format.
    let candidateProjectId = str(body.projectId);
    if (!candidateProjectId && (fields.collegeName && fields.department && fields.clientPhone)) {
      const generated = generateProjectId(fields.collegeName, fields.department, fields.clientPhone);
      if (generated && !generated.includes("COLLEGE") && !generated.includes("BRANCH") && !generated.includes("XXXX")) {
        candidateProjectId = generated;
      }
    }

    let project: any = null;
    if (candidateProjectId) {
      for (let attempt = 0; attempt < 5 && !project; attempt++) {
        const pId = attempt === 0 ? candidateProjectId : `${candidateProjectId}-${attempt + 1}`;
        try {
          project = await Project.create({ projectId: pId, ...data });
        } catch (err: any) {
          if (!isDuplicateKeyError(err) || attempt === 4) throw err;
        }
      }
    } else {
      for (let attempt = 0; attempt < 5 && !project; attempt++) {
        const projectId = await nextSequentialId(Project, "projectId", `PRJ-${year}-`, 5, attempt);
        try {
          project = await Project.create({ projectId, ...data });
        } catch (err: any) {
          if (!isDuplicateKeyError(err) || attempt === 4) throw err;
        }
      }
    }

    if (pdf) {
      await ProjectDocument.create({
        projectId: project._id,
        uploadedBy: session.userId,
        fileName: pdf.name,
        fileUrl: "pending",
        fileType: "application/pdf",
        fileSize: pdf.buffer.length,
        category: "REQUIREMENT",
        data: pdf.buffer,
      }).then(async (doc) => {
        doc.fileUrl = `/api/documents/${doc._id}`;
        await doc.save();
      });
    }

    // Activity Log
    await logActivity({
      userId: session.userId,
      role: session.role,
      action: "PROJECT_SUBMITTED",
      projectId: project._id,
      entityId: project.projectId,
      entityType: "PROJECT",
      description: `${session.name} submitted project ${project.projectId}: "${project.projectName}".`,
      metadata: { budget: project.expectedBudget, projectType: project.projectType },
    });

    // In-app notifications
    await createNotification({
      userId: targetStudentId,
      title: "Project Submitted Successfully",
      message: `Your project ${project.projectName} (${project.projectId}) is now under review.`,
      type: "PROJECT",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    await notifyAdmins({
      title: `New Project: ${project.projectId}`,
      message: `${studentUser.name} submitted ${project.projectName} (${project.projectType}).`,
      type: "PROJECT",
      relatedEntityId: project.projectId,
      relatedEntityType: "PROJECT",
    });

    // Send confirmation email
    const tmpl = EmailTemplates.projectSubmitted(studentUser.name, project.projectName, project.projectId);
    await sendEmail({
      to: studentUser.email,
      subject: tmpl.subject,
      html: tmpl.html,
    });

    return NextResponse.json({
      success: true,
      message: "Project submitted successfully!",
      project,
    });
  } catch (err: any) {
    return handleApiError(err);
  }
}
