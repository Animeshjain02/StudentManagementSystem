import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuotationResponse extends Document {
  _id: mongoose.Types.ObjectId;
  quotationId: mongoose.Types.ObjectId;
  version: number;
  action: "ACCEPTED" | "REJECTED" | "CHANGES_REQUESTED";
  reason?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const QuotationResponseSchema = new Schema<IQuotationResponse>(
  {
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    action: {
      type: String,
      enum: ["ACCEPTED", "REJECTED", "CHANGES_REQUESTED"],
      required: true,
    },
    reason: { type: String, default: "" },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const QuotationResponse: Model<IQuotationResponse> =
  mongoose.models.QuotationResponse ||
  mongoose.model<IQuotationResponse>(
    "QuotationResponse",
    QuotationResponseSchema
  );
