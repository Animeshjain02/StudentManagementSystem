import mongoose, { Schema, Document, Model } from "mongoose";

export const DOCUMENT_CATEGORIES = [
  "REQUIREMENT",
  "SPECIFICATION",
  "QUOTATION",
  "DELIVERABLE",
  "RECEIPT",
  "OTHER",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface IDocumentItem extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocumentItem>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORIES,
      default: "OTHER",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ProjectDocument: Model<IDocumentItem> =
  mongoose.models.ProjectDocument ||
  mongoose.model<IDocumentItem>("ProjectDocument", DocumentSchema);
