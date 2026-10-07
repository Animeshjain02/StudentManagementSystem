import mongoose, { Schema, Document, Model } from "mongoose";

export const PROJECT_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REQUIREMENT_CLARIFICATION",
  "QUOTATION_PREPARATION",
  "QUOTATION_SENT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ASSIGNED",
  "WORKING",
  "TESTING",
  "CLIENT_REVIEW",
  "CHANGES_REQUESTED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "Desktop Application",
  "AI/ML",
  "Data Science",
  "ERP",
  "CRM",
  "E-commerce",
  "Other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: string;
  studentId: mongoose.Types.ObjectId;
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
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      enum: PROJECT_TYPES,
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
    expectedBudget: { type: Number, required: true, min: 0 },
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
ProjectSchema.index({ createdAt: -1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
