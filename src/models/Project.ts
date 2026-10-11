import mongoose, { Schema, Document, Model } from "mongoose";
import { PROJECT_STATUSES, type ProjectStatus, PROJECT_TYPES, type ProjectType } from "@/lib/constants";

export { PROJECT_STATUSES, PROJECT_TYPES };
export type { ProjectStatus, ProjectType };

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  studentId: mongoose.Types.ObjectId;
  source?: "DIRECT" | "AMBASSADOR";
  isDirect?: boolean;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  collegeName: string;
  department: string;
  projectType: ProjectType;
  description: string;
  requirements: {
    functionalRequirements?: string;
    technicalRequirements?: string;
    expectedFeatures?: string;
    referenceLinks?: string;
  };
  expectedBudget: number;
  approvedBudget?: number;
  status: ProjectStatus;
  startDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  assignedTeam: string[];
  notes?: string;
  trackingHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    trackingHash: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["DIRECT", "AMBASSADOR"],
      default: "AMBASSADOR",
      index: true,
    },
    isDirect: {
      type: Boolean,
      default: false,
      index: true,
    },
    projectName: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    clientPhone: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    projectType: {
      type: String,
      enum: [...PROJECT_TYPES, "Web Application", "Mobile Application", "Desktop Application", "AI/ML", "Data Science", "ERP", "CRM", "E-commerce", "Other"],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    requirements: {
      functionalRequirements: { type: String, default: "" },
      technicalRequirements: { type: String, default: "" },
      expectedFeatures: { type: String, default: "" },
      referenceLinks: { type: String, default: "" },
    },
    // Optional: ambassadors no longer state a budget; pricing comes from the admin's quotation
    expectedBudget: { type: Number, default: 0, min: 0 },
    approvedBudget: { type: Number, min: 0 },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "SUBMITTED",
      index: true,
    },
    startDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    assignedTeam: [{ type: String }],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

ProjectSchema.index({ studentId: 1, status: 1 });
ProjectSchema.index({ studentId: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ collegeName: 1 });
ProjectSchema.index({ createdAt: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Project) {
  delete (mongoose.models as any).Project;
}

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
