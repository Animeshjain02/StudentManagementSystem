import { handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [rawNotifications, unreadCount] = await Promise.all([
      Notification.find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({
        userId: session.userId,
        isRead: false,
      }),
    ]);

    const isAdmin = session.role === "ADMIN";

    const notifications = rawNotifications.map((notif: any) => {
      let targetUrl = isAdmin ? "/admin/projects" : "/student/projects";
      const entityId = notif.relatedEntityId;
      const entityType = notif.relatedEntityType || notif.type;

      if (entityType === "PROJECT" && entityId) {
        targetUrl = isAdmin ? `/admin/projects/${entityId}` : `/student/projects/${entityId}`;
      } else if (entityType === "QUOTATION") {
        if (entityId) {
          targetUrl = isAdmin ? `/admin/quotations/${entityId}` : `/student/quotations/${entityId}`;
        } else {
          targetUrl = isAdmin ? "/admin/quotations" : "/student/projects";
        }
      } else if (entityType === "PAYMENT") {
        targetUrl = isAdmin ? "/admin/payments" : "/student/payments";
      } else if (entityType === "STUDENT" && entityId) {
        targetUrl = isAdmin ? `/admin/students/${entityId}` : "/student/dashboard";
      } else {
        const text = `${notif.title || ""} ${notif.message || ""}`;
        const match = text.match(/PRJ-\d{4}-\d{5}/i);
        if (match) {
          targetUrl = isAdmin ? `/admin/projects/${match[0]}` : `/student/projects/${match[0]}`;
        }
      }

      return {
        ...notif,
        targetUrl,
      };
    });

    return NextResponse.json(
      { notifications, unreadCount },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      }
    );
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

    await connectToDatabase();
    await Notification.updateMany({ userId: session.userId, isRead: false }, { isRead: true });

    return NextResponse.json({ success: true, message: "All notifications marked as read." });
  } catch (err: any) {
    return handleApiError(err);
  }
}
