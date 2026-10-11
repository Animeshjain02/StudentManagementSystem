import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ambassadorId: string;
  phone: string;
  collegeName: string;
  university?: string;
  course: string;
  branch: string;
  semester: string;
  collegeId?: string;
  joiningDate: Date;
  referralCode: string;
  profilePhoto?: string;
  status: "ACTIVE" | "INACTIVE" | "DISABLED" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    ambassadorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true, index: true },
    university: { type: String, trim: true },
    course: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    collegeId: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    referralCode: { type: String, trim: true },
    profilePhoto: { type: String },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DISABLED", "SUSPENDED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", StudentProfileSchema);
