import connectToDatabase from "@/lib/db";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { Payment } from "@/models/Payment";
import mongoose from "mongoose";

interface StudentCacheItem {
  data: any;
  timestamp: number;
}

const serverStudentCache = new Map<string, StudentCacheItem>();
const CACHE_TTL_MS = 20_000; // 20 seconds cache

export function invalidateStudentDashboardCache(userId?: string) {
  if (userId) {
    serverStudentCache.delete(userId);
  } else {
    serverStudentCache.clear();
  }
}

export async function getStudentDashboardData(userId?: string, forceFresh = false) {
  const cacheKey = userId || "default";

  if (!forceFresh) {
    const cached = serverStudentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  await connectToDatabase();

  const userObjectId =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

  const projectMatch: any = userObjectId ? { studentId: userObjectId } : {};

  // Run bounded queries & native aggregations in parallel
  const [
    recentProjects,
    statsAggResult,
    payAggResult,
    allStudentProjectIds
  ] = await Promise.all([
    // 1. Top 10 most recent projects only (bounded with index scan)
    Project.find(projectMatch)
      .select("projectId projectName status expectedBudget approvedBudget collegeName createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    // 2. Aggregate stats directly on database engine
    Project.aggregate([
      { $match: projectMatch },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          totalProjectValue: {
            $sum: { $ifNull: ["$approvedBudget", { $ifNull: ["$expectedBudget", 0] }] }
          },
          underReview: {
            $sum: {
              $cond: [
                { $in: ["$status", ["SUBMITTED", "UNDER_REVIEW", "REQUIREMENT_CLARIFICATION"]] },
                1,
                0
              ]
            }
          },
          approvedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] }
          },
          workingProjects: {
            $sum: {
              $cond: [
                { $in: ["$status", ["ASSIGNED", "WORKING", "TESTING", "CLIENT_REVIEW"]] },
                1,
                0
              ]
            }
          },
          deliveredProjects: {
            $sum: {
              $cond: [
                { $in: ["$status", ["READY_FOR_DELIVERY", "DELIVERED"]] },
                1,
                0
              ]
            }
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
          }
        }
      }
    ]),

    // 3. Aggregate payments sum natively on database engine
    Payment.aggregate([
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "proj"
        }
      },
      { $unwind: "$proj" },
      ...(userObjectId ? [{ $match: { "proj.studentId": userObjectId } }] : []),
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" }
        }
      }
    ]),

    // 4. Get student's project IDs for targeted quotation lookup
    Project.find(projectMatch).select("_id").lean().then((list) => list.map((p: any) => p._id))
  ]);

  // 5. Fetch ONLY actionable quotations (max 5) requiring student response
  let actionableQuotations: any[] = [];
  let quotationsPendingCount = 0;

  if (allStudentProjectIds.length > 0) {
    const [actionable, pendingCount] = await Promise.all([
      Quotation.find({
        projectId: { $in: allStudentProjectIds },
        status: { $in: ["SENT", "VIEWED"] },
      })
        .select("quotationId status total validUntil projectId createdAt")
        .populate("projectId", "projectName")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Quotation.countDocuments({
        projectId: { $in: allStudentProjectIds },
        status: { $in: ["SENT", "VIEWED", "CHANGES_REQUESTED"] },
      })
    ]);

    actionableQuotations = actionable;
    quotationsPendingCount = pendingCount;
  }

  const stats = statsAggResult[0] || {};
  const totalProjects = stats.totalProjects || 0;
  const totalProjectValue = stats.totalProjectValue || 0;
  const totalPaid = payAggResult[0]?.totalPaid || 0;
  const pendingPayment = Math.max(0, totalProjectValue - totalPaid);

  const data = {
    projects: recentProjects.map((p: any) => ({
      _id: p._id.toString(),
      projectId: p.projectId,
      projectName: p.projectName,
      status: p.status,
      expectedBudget: p.expectedBudget,
      approvedBudget: p.approvedBudget,
      collegeName: p.collegeName,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
    })),
    quotations: actionableQuotations.map((q: any) => ({
      _id: q._id.toString(),
      quotationId: q.quotationId,
      status: q.status,
      total: q.total,
      validUntil: q.validUntil ? q.validUntil.toISOString() : null,
      projectId: q.projectId
        ? {
            _id: q.projectId._id?.toString() || "",
            projectName: q.projectId.projectName || "Student Project",
          }
        : undefined,
    })),
    stats: {
      totalProjects,
      underReview: stats.underReview || 0,
      quotationsPending: quotationsPendingCount,
      approvedProjects: stats.approvedProjects || 0,
      workingProjects: stats.workingProjects || 0,
      deliveredProjects: stats.deliveredProjects || 0,
      completedProjects: stats.completedProjects || 0,
      pendingPayment,
      totalProjectValue,
    },
  };

  serverStudentCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

