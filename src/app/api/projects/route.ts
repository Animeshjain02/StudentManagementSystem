import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Project, PROJECT_TYPES, ProjectStatus } from "@/models/Project";
import { StudentProfile } from "@/models/StudentProfile";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { createNotification, notifyAdmins } from "@/lib/notification";
import { sendEmail, EmailTemplates } from "@/lib/email";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const query: any = {};

    // RULE 8: Student can ONLY see their own projects
    if (session.role === "STUDENT") {
      query.studentId = session.userId;
    }

    if (status) query.status = status;
    if (projectType) query.projectType = projectType;
    if (college) query.collegeName = college;

    if (search) {
      const qRegex = { $regex: search, $options: "i" };
      query.$or = [
        { projectId: qRegex },
        { projectName: qRegex },
        { clientName: qRegex },
        { collegeName: qRegex },
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate("studentId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      projectName,
      clientName,
      clientEmail,
      clientPhone,
      collegeName,
      department,
      projectType,
      description,
      functionalRequirements,
      technicalRequirements,
      expectedFeatures,
      referenceLinks,
      expectedBudget,
      studentId: overrideStudentId, // only allowed for Admin
    } = body;

    if (!projectName || !clientName || !clientEmail || !projectType || !description || !expectedBudget) {
      return NextResponse.json(
        { error: "Please fill out all mandatory project details and requirements." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let targetStudentId = session.userId;
    if (session.role === "ADMIN" && overrideStudentId) {
      targetStudentId = overrideStudentId;
    }

    const studentUser = await User.findById(targetStudentId);
    if (!studentUser) {
      return NextResponse.json({ error: "Associated student not found." }, { status: 404 });
    }

    const studentProfile = await StudentProfile.findOne({ userId: targetStudentId });

    // Generate unique Project ID: PRJ-2026-XXXXX
    const count = await Project.countDocuments();
    const year = new Date().getFullYear();
    const projectId = `PRJ-${year}-${String(count + 1).padStart(5, "0")}`;

    const project = await Project.create({
      projectId,
      studentId: targetStudentId,
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.toLowerCase().trim(),
      clientPhone: clientPhone?.trim() || studentProfile?.phone || "",
      collegeName: collegeName?.trim() || studentProfile?.collegeName || "N/A",
      department: department?.trim() || studentProfile?.branch || "N/A",
      projectType,
      description: description.trim(),
      requirements: {
        functionalRequirements: functionalRequirements?.trim() || "",
        technicalRequirements: technicalRequirements?.trim() || "",
        expectedFeatures: expectedFeatures?.trim() || "",
        referenceLinks: referenceLinks?.trim() || "",
      },
      expectedBudget: Number(expectedBudget),
      status: "SUBMITTED",
      assignedTeam: [],
    });

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
