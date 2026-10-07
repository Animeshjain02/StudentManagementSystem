import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  _id: mongoose.Types.ObjectId;
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  email: string;
  phone: string;
  taxPercentage: number;
  defaultQuotationValidityDays: number;
  defaultPaymentTerms: string;
  notificationEmailEnabled: boolean;
  projectPrefix: string;
  ambassadorPrefix: string;
  quotationPrefix: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    companyName: { type: String, default: "NexusDev Solutions Pvt Ltd" },
    companyLogo: { type: String, default: "/logo.png" },
    companyAddress: {
      type: String,
      default: "Tech Innovation Tower, 4th Floor, Bangalore, Karnataka - 560100",
    },
    email: { type: String, default: "contact@nexusdev.com" },
    phone: { type: String, default: "+91 98765 43210" },
    taxPercentage: { type: Number, default: 18 },
    defaultQuotationValidityDays: { type: Number, default: 15 },
    defaultPaymentTerms: {
      type: String,
      default: "50% Advance upon approval, 30% after Alpha Demo, 20% on Delivery.",
    },
    notificationEmailEnabled: { type: Boolean, default: true },
    projectPrefix: { type: String, default: "PRJ-2026-" },
    ambassadorPrefix: { type: String, default: "CA-2026-" },
    quotationPrefix: { type: String, default: "QT-2026-" },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
