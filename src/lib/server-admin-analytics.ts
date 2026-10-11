import connectToDatabase from "@/lib/db";
import { User } from "@/models/User";
import { StudentProfile } from "@/models/StudentProfile";
import { Project } from "@/models/Project";
import { Quotation } from "@/models/Quotation";
import { Payment } from "@/models/Payment";

interface AnalyticsCache {
  data: any;
  timestamp: number;
}

let cachedServerAnalytics: AnalyticsCache | null = null;
const CACHE_TTL_MS = 20_000; // 20s in-memory server cache

export function invalidateAdminAnalyticsCache() {
  cachedServerAnalytics = null;
}

export async function getAdminAnalytics(forceFresh = false) {
  if (!forceFresh && cachedServerAnalytics && Date.now() - cachedServerAnalytics.timestamp < CACHE_TTL_MS) {
    return cachedServerAnalytics.data;
  }

  await connectToDatabase();

  // Run aggregation pipelines natively on MongoDB engine
  const [projectAggResult, paymentAggResult, totalAmbassadors, activeAmbassadors] = await Promise.all([
    Project.aggregate([
      {
        $facet: {
          statusCounts: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          typeCounts: [
            { $group: { _id: "$projectType", count: { $sum: 1 } } }
          ],
          collegeCounts: [
            { $match: { collegeName: { $exists: true, $ne: "" } } },
            { $group: { _id: "$collegeName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalProjects: { $sum: 1 },
                totalProjectValue: {
                  $sum: { $ifNull: ["$approvedBudget", { $ifNull: ["$expectedBudget", 0] }] }
                }
              }
            }
          ],
          ambassadorStats: [
            {
              $group: {
                _id: "$studentId",
                submitted: { $sum: 1 },
                totalValue: {
                  $sum: { $ifNull: ["$approvedBudget", { $ifNull: ["$expectedBudget", 0] }] }
                },
                approved: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["APPROVED", "WORKING", "TESTING", "CLIENT_REVIEW", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"]] },
                      1,
                      0
                    ]
                  }
                },
                working: {
                  $sum: {
                    $cond: [
                      { $in: ["$status", ["WORKING", "TESTING", "CLIENT_REVIEW"]] },
                      1,
                      0
                    ]
                  }
                },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] }
                },
                cancelled: {
                  $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] }
                }
              }
            },
            { $sort: { totalValue: -1, submitted: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: null,
          totalReceived: { $sum: "$amount" }
        }
      }
    ]),
    User.countDocuments({ role: "STUDENT" }),
    User.countDocuments({ role: "STUDENT", status: "ACTIVE" })
  ]);

  const facet = projectAggResult[0] || {};
  const statusCountsMap: Record<string, number> = {};
  (facet.statusCounts || []).forEach((item: any) => {
    if (item._id) statusCountsMap[item._id] = item.count;
  });

  const totalProjects = facet.totals?.[0]?.totalProjects || 0;
  const totalProjectValue = facet.totals?.[0]?.totalProjectValue || 0;
  const totalPaymentReceived = paymentAggResult?.[0]?.totalReceived || 0;
  const pendingPayment = Math.max(0, totalProjectValue - totalPaymentReceived);

  const newProjects = statusCountsMap["SUBMITTED"] || 0;
  const projectsUnderReview =
    (statusCountsMap["UNDER_REVIEW"] || 0) + (statusCountsMap["REQUIREMENT_CLARIFICATION"] || 0);
  const quotationsPending =
    (statusCountsMap["QUOTATION_PREPARATION"] || 0) +
    (statusCountsMap["QUOTATION_SENT"] || 0) +
    (statusCountsMap["AWAITING_APPROVAL"] || 0) +
    (statusCountsMap["CHANGES_REQUESTED"] || 0);
  const approvedProjects = statusCountsMap["APPROVED"] || 0;
  const workingProjects =
    (statusCountsMap["ASSIGNED"] || 0) +
    (statusCountsMap["WORKING"] || 0) +
    (statusCountsMap["TESTING"] || 0) +
    (statusCountsMap["CLIENT_REVIEW"] || 0);
  const deliveredProjects =
    (statusCountsMap["READY_FOR_DELIVERY"] || 0) + (statusCountsMap["DELIVERED"] || 0);
  const completedProjects = statusCountsMap["COMPLETED"] || 0;

  // Chart data
  const projectsByStatus = Object.entries(statusCountsMap).map(([status, count]) => ({
    status,
    count,
  }));

  const projectsByType = (facet.typeCounts || []).map((t: any) => ({
    type: t._id || "Other",
    count: t.count,
  }));

  const collegeWiseProjects = (facet.collegeCounts || []).map((c: any) => ({
    college: c._id || "Unknown",
    count: c.count,
  }));

  // Ambassador Leaderboard / Registered Ambassadors list
  const allStudents = await User.find({ role: "STUDENT" })
    .select("name email _id createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const studentIds = allStudents.map((s: any) => s._id);
  const rawAmbassadors = facet.ambassadorStats || [];
  const statsMap = new Map<string, any>(rawAmbassadors.map((a: any) => [a._id?.toString(), a]));

  const [profiles, payments] = await Promise.all([
    StudentProfile.find({ userId: { $in: studentIds } })
      .select("userId ambassadorId collegeName branch phone")
      .lean(),
    studentIds.length > 0
      ? Payment.aggregate([
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "_id",
              as: "proj",
            },
          },
          { $unwind: "$proj" },
          { $match: { "proj.studentId": { $in: studentIds } } },
          {
            $group: {
              _id: "$proj.studentId",
              revenue: { $sum: "$amount" },
            },
          },
        ])
      : [],
  ]);

  const profileMap = new Map<string, any>(profiles.map((p: any) => [p.userId?.toString(), p]));
  const revenueMap = new Map<string, number>(payments.map((p: any) => [p._id?.toString(), p.revenue]));

  let topAmbassadors = allStudents.map((u: any) => {
    const sId = u._id.toString();
    const a = statsMap.get(sId);
    const profile = profileMap.get(sId);
    const rev = revenueMap.get(sId) || 0;
    const submitted = a?.submitted || 0;
    const approved = a?.approved || 0;
    const totalVal = a?.totalValue || 0;

    return {
      userId: sId,
      name: u.name || "Ambassador",
      email: u.email,
      ambassadorId: profile?.ambassadorId || "CA-N/A",
      collegeName: profile?.collegeName || "N/A",
      branch: profile?.branch || "N/A",
      phone: profile?.phone || "N/A",
      submitted,
      approved,
      working: a?.working || 0,
      completed: a?.completed || 0,
      rejected: a?.rejected || 0,
      cancelled: a?.cancelled || 0,
      totalValue: totalVal,
      totalRevenue: rev,
      conversionRate: submitted > 0 ? Math.round((approved / submitted) * 100) : 0,
      pendingPayment: Math.max(0, totalVal - rev),
      createdAt: u.createdAt,
    };
  });

  // Sort: highest project value first, then submitted count, then newest registration
  topAmbassadors.sort((x, y) => {
    if (y.totalValue !== x.totalValue) return y.totalValue - x.totalValue;
    if (y.submitted !== x.submitted) return y.submitted - x.submitted;
    return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
  });

  const data = {
    cards: {
      totalAmbassadors,
      activeAmbassadors,
      totalProjects,
      newProjects,
      projectsUnderReview,
      quotationsPending,
      approvedProjects,
      workingProjects,
      deliveredProjects,
      completedProjects,
      totalProjectValue,
      totalPaymentReceived,
      pendingPayment,
    },
    charts: {
      projectsByStatus,
      projectsByType,
      collegeWiseProjects,
    },
    topAmbassadors,
  };

  cachedServerAnalytics = {
    data,
    timestamp: Date.now(),
  };

  return data;
}
