import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ALERT" | "PROJECT" | "QUOTATION" | "PAYMENT";
  relatedEntityId?: string;
  relatedEntityType?: "PROJECT" | "QUOTATION" | "PAYMENT" | "STUDENT";
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["INFO", "SUCCESS", "WARNING", "ALERT", "PROJECT", "QUOTATION", "PAYMENT"],
      default: "INFO",
    },
    relatedEntityId: { type: String },
    relatedEntityType: {
      type: String,
      enum: ["PROJECT", "QUOTATION", "PAYMENT", "STUDENT"],
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
