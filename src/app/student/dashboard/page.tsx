"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  FolderGit2,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  PlayCircle,
  Truck,
  Trophy,
  CreditCard,
  IndianRupee,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    projects: [],
    quotations: [],
    stats: {
      totalProjects: 0,
      underReview: 0,
      quotationsPending: 0,
      approvedProjects: 0,
      workingProjects: 0,
      deliveredProjects: 0,
      completedProjects: 0,
      pendingPayment: 0,
      totalProjectValue: 0,
    },
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [projRes, quotRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/quotations"),
        ]);

        const projData = await projRes.json();
        const quotData = await quotRes.json();

        const projects = projData.projects || [];
        const quotations = quotData.quotations || [];

        // Compute metrics
        const totalProjects = projects.length;
        const underReview = projects.filter((p: any) =>
          ["SUBMITTED", "UNDER_REVIEW", "REQUIREMENT_CLARIFICATION"].includes(p.status)
        ).length;
        const quotationsPending = quotations.filter((q: any) =>
          ["SENT", "VIEWED", "CHANGES_REQUESTED"].includes(q.status)
        ).length;
        const approvedProjects = projects.filter((p: any) => p.status === "APPROVED").length;
        const workingProjects = projects.filter((p: any) =>
          ["ASSIGNED", "WORKING", "TESTING", "CLIENT_REVIEW"].includes(p.status)
        ).length;
        const deliveredProjects = projects.filter((p: any) =>
          ["READY_FOR_DELIVERY", "DELIVERED"].includes(p.status)
        ).length;
        const completedProjects = projects.filter((p: any) => p.status === "COMPLETED").length;

        const totalProjectValue = projects.reduce(
          (acc: number, p: any) => acc + (p.approvedBudget || p.expectedBudget || 0),
          0
        );

        // Fetch payments for pending balance calculation
        const payRes = await fetch("/api/payments");
        const payData = await payRes.json();
        const totalPaid = (payData.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0);
        const pendingPayment = Math.max(0, totalProjectValue - totalPaid);

        setData({
          projects,
          quotations,
          stats: {
            totalProjects,
            underReview,
            quotationsPending,
            approvedProjects,
            workingProjects,
            deliveredProjects,
            completedProjects,
            pendingPayment,
            totalProjectValue,
          },
        });
      } catch (e) {
        console.error("Dashboard error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const { stats, projects, quotations } = data;

  const cards = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderGit2, color: "text-indigo-600 bg-indigo-50" },
    { label: "Projects Under Review", value: stats.underReview, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Quotations Pending", value: stats.quotationsPending, icon: FileSpreadsheet, color: "text-blue-600 bg-blue-50" },
    { label: "Approved Projects", value: stats.approvedProjects, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Working Projects", value: stats.workingProjects, icon: PlayCircle, color: "text-purple-600 bg-purple-50" },
    { label: "Delivered Projects", value: stats.deliveredProjects, icon: Truck, color: "text-teal-600 bg-teal-50" },
    { label: "Completed Projects", value: stats.completedProjects, icon: Trophy, color: "text-amber-600 bg-amber-50" },
    {
      label: "Pending Payment",
      value: `₹${stats.pendingPayment.toLocaleString()}`,
      icon: CreditCard,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Total Project Value",
      value: `₹${stats.totalProjectValue.toLocaleString()}`,
      icon: IndianRupee,
      color: "text-indigo-600 bg-indigo-50",
      highlight: true,
    },
  ];

  return (
    <StudentLayout
      title="Campus Ambassador Dashboard"
      subtitle="Track your campus project referrals, quotations, and active sprint delivery"
    >
      {/* Welcome & Action Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Have a new student or capstone project?</h2>
            <p className="text-xs text-indigo-100 mt-1 max-w-xl">
              Submit your college project requirements. Our technical team prepares formal architecture proposals and quotations within 24 hours.
            </p>
          </div>
          <Link
            href="/student/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-xs shadow-sm hover:bg-indigo-50 transition-colors flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-indigo-700" />
            <span>Submit New Project</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid (Requirement 8) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-xl bg-white border ${
                card.highlight ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"
              } shadow-xs transition-hover hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {loading ? "..." : card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Required: Quotations Needing Review */}
      {quotations.filter((q: any) => ["SENT", "VIEWED"].includes(q.status)).length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Quotations Awaiting Your Action
              </h3>
            </div>
            <Link href="/student/quotations" className="text-xs font-semibold text-amber-800 hover:underline">
              View all quotations &rarr;
            </Link>
          </div>

          <div className="space-y-2">
            {quotations
              .filter((q: any) => ["SENT", "VIEWED"].includes(q.status))
              .map((q: any) => (
                <div
                  key={q._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white border border-amber-200/60 shadow-2xs gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{q.quotationId}</span>
                      <span className="text-xs text-slate-600 font-medium">
                        for {q.projectId?.projectName || "Student Project"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Total: <strong className="text-slate-800">₹{q.total?.toLocaleString()}</strong> &bull; Valid Until:{" "}
                      {new Date(q.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href={`/student/quotations/${q._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs transition-colors self-start sm:self-auto"
                  >
                    <span>Review & Respond</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your College Projects</h3>
            <p className="text-xs text-slate-500">Live development status & deliverables</p>
          </div>
          <Link
            href="/student/projects"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No projects submitted yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start referring college projects or campus student teams to earn incentives and manage projects.
            </p>
            <Link
              href="/student/projects/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit First Project</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Project ID</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {projects.slice(0, 6).map((proj: any) => (
                  <tr key={proj._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                      {proj.projectId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {proj.projectName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{proj.clientName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {proj.projectType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      ₹{(proj.approvedBudget || proj.expectedBudget)?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={proj.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/student/projects/${proj._id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
