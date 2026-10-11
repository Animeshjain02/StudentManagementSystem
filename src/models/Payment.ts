import mongoose, { Schema, Document, Model } from "mongoose";

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Cash",
  "Cheque",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  receiptUrl?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true, index: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    transactionReference: { type: String, required: true, trim: true },
    receiptUrl: { type: String },
    notes: { type: String, default: "" },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ projectId: 1, paymentDate: -1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
