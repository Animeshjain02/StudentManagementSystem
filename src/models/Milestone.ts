import mongoose, { Schema, Document, Model } from "mongoose";

export const MILESTONE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface IMilestone extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  startDate: Date;
  dueDate: Date;
  completedAt?: Date;
  status: MilestoneStatus;
  progress: number;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      default: "PENDING",
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    assignedTo: { type: String, default: "Development Team" },
  },
  { timestamps: true }
);

export const Milestone: Model<IMilestone> =
  mongoose.models.Milestone ||
  mongoose.model<IMilestone>("Milestone", MilestoneSchema);
