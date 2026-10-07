import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";

export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  relatedEntityId,
  relatedEntityType,
}: {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ALERT" | "PROJECT" | "QUOTATION" | "PAYMENT";
  relatedEntityId?: string;
  relatedEntityType?: "PROJECT" | "QUOTATION" | "PAYMENT" | "STUDENT";
}) {
  try {
    await connectToDatabase();
    return await Notification.create({
      userId: new mongoose.Types.ObjectId(userId.toString()),
      title,
      message,
      type,
      relatedEntityId,
      relatedEntityType,
      isRead: false,
    });
  } catch (err: any) {
    console.error("Failed to create notification:", err.message);
  }
}

export async function notifyAdmins({
  title,
  message,
  type = "INFO",
  relatedEntityId,
  relatedEntityType,
}: {
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ALERT" | "PROJECT" | "QUOTATION" | "PAYMENT";
  relatedEntityId?: string;
  relatedEntityType?: "PROJECT" | "QUOTATION" | "PAYMENT" | "STUDENT";
}) {
  try {
    await connectToDatabase();
    const admins = await User.find({ role: "ADMIN" });
    const promises = admins.map((admin) =>
      createNotification({
        userId: admin._id,
        title,
        message,
        type,
        relatedEntityId,
        relatedEntityType,
      })
    );
    await Promise.all(promises);
  } catch (err: any) {
    console.error("Failed to notify admins:", err.message);
  }
}
