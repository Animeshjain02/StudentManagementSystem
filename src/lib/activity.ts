import { ActivityLog } from "@/models/ActivityLog";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";

export async function logActivity({
  userId,
  role,
  action,
  description,
  projectId,
  entityId,
  entityType,
  metadata,
}: {
  userId: string | mongoose.Types.ObjectId;
  role: "ADMIN" | "STUDENT" | "SYSTEM";
  action: string;
  description: string;
  projectId?: string | mongoose.Types.ObjectId;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await connectToDatabase();
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId.toString()),
      role,
      action,
      description,
      projectId: projectId ? new mongoose.Types.ObjectId(projectId.toString()) : undefined,
      entityId,
      entityType,
      metadata,
    });
  } catch (err: any) {
    console.error("Failed to write activity log:", err.message);
  }
}
