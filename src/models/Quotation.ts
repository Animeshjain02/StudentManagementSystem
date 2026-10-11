import mongoose, { Schema, Document, Model } from "mongoose";

export const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface IQuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IQuotation extends Document {
  _id: mongoose.Types.ObjectId;
  quotationId: string;
  projectId: mongoose.Types.ObjectId;
  version: number;
  items: IQuotationItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxPercentage?: number;
  total: number;
  validUntil: Date;
  paymentTerms: string;
  deliveryTimeline: string;
  terms: string;
  notes?: string;
  status: QuotationStatus;
  createdBy: mongoose.Types.ObjectId;
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  requestedChanges?: string;
  changeReason?: string;
  previousAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema<IQuotationItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    quotationId: { type: String, required: true, trim: true, index: true },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    version: { type: Number, default: 1 },
    items: { type: [QuotationItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, min: 0, max: 100 },
    total: { type: Number, required: true, min: 0 },
    validUntil: { type: Date, required: true },
    paymentTerms: { type: String, required: true },
    deliveryTimeline: { type: String, required: true },
    terms: { type: String, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: "DRAFT",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    requestedChanges: { type: String },
    changeReason: { type: String },
    previousAmount: { type: Number },
  },
  { timestamps: true }
);

QuotationSchema.index({ quotationId: 1, version: 1 }, { unique: true });
QuotationSchema.index({ projectId: 1, status: 1 });
QuotationSchema.index({ projectId: 1, createdAt: -1 });
QuotationSchema.index({ status: 1, createdAt: -1 });
QuotationSchema.index({ createdAt: -1 });

export const Quotation: Model<IQuotation> =
  mongoose.models.Quotation ||
  mongoose.model<IQuotation>("Quotation", QuotationSchema);
