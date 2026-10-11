"use client";

import { formatCurrency } from "@/lib/format";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { subscribeToRealtime } from "@/lib/realtime";
import {
  Users,
  FolderGit2,
  FileSpreadsheet,
  CheckCircle2,
  PlayCircle,
  Truck,
  Trophy,
  CreditCard,
  IndianRupee,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Database,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminDashboardClientProps {
  initialData: any;
}

export function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [data, setData] = useState<any>(initialData);

  const refreshData = async () => {
    try {
      const res = await fetch("/api/admin/analytics?fresh=true");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();

    const unsubscribe = subscribeToRealtime(() => {
      refreshData();
    });

    const interval = setInterval(() => {
      refreshData();
    }, 2500);

    const onFocus = () => refreshData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const topAmbassadors = data?.topAmbassadors || [];

  const metricCards = [
    { label: "Total Ambassadors", value: cards.totalAmbassadors ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Active Ambassadors", value: cards.activeAmbassadors ?? 0, icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Projects", value: cards.totalProjects ?? 0, icon: FolderGit2, color: "text-indigo-600 bg-indigo-50" },
    { label: "New Submissions", value: cards.newProjects ?? 0, icon: FolderGit2, color: "text-amber-600 bg-amber-50" },
    { label: "Under Review", value: cards.projectsUnderReview ?? 0, icon: FolderGit2, color: "text-orange-600 bg-orange-50" },
    { label: "Quotations Pending", value: cards.quotationsPending ?? 0, icon: FileSpreadsheet, color: "text-purple-600 bg-purple-50" },
    { label: "Approved Projects", value: cards.approvedProjects ?? 0, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
    { label: "Working / Sprints", value: cards.workingProjects ?? 0, icon: PlayCircle, color: "text-indigo-600 bg-indigo-50" },
    { label: "Delivered", value: cards.deliveredProjects ?? 0, icon: Truck, color: "text-blue-600 bg-blue-50" },
    { label: "Completed Projects", value: cards.completedProjects ?? 0, icon: Trophy, color: "text-emerald-600 bg-emerald-50" },
    {
      label: "Total Project Value",
      value: formatCurrency(cards.totalProjectValue),
      icon: IndianRupee,
      color: "text-slate-900 bg-slate-100",
      highlight: true,
    },
    {
      label: "Payments Received",
      value: formatCurrency(cards.totalPaymentReceived),
      icon: CreditCard,
      color: "text-emerald-600 bg-emerald-50",
      highlight: true,
    },
    {
      label: "Pending Receivables",
      value: formatCurrency(cards.pendingPayment),
      icon: CreditCard,
      color: "text-rose-600 bg-rose-50",
      highlight: true,
    },
  ];

  return (
    <AdminLayout
      title="Executive Overview"
      subtitle="Campus Ambassador pipeline, project lifecycle status, and financial health"
    >
      {/* Top Banner */}
      <div className="pb-6 mb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h2>
          <p className="text-xs text-slate-500">Live operational overview of student projects</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 mb-8">
        {metricCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-xl bg-white border ${
                c.highlight ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"
              } shadow-2xs`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500">{c.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight" suppressHydrationWarning>
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart 1: Projects by Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Projects by Status</h3>
              <p className="text-xs text-slate-500">Distribution across active workflow stages</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {charts.projectsByStatus?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.projectsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No project data available
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: College-wise Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Colleges by Projects</h3>
              <p className="text-xs text-slate-500">Campus Ambassador outreach volume</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {charts.collegeWiseProjects?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.collegeWiseProjects} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="college" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No college data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ambassador Performance Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-8">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ambassador Performance & Pipeline</h3>
            <p className="text-xs text-slate-500">Conversion rate, revenue attribution, and pipeline value</p>
          </div>
          <Link
            href="/admin/students"
            prefetch={false}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Ambassador</th>
                <th className="py-3 px-4">College</th>
                <th className="py-3 px-4 text-center">Submitted</th>
                <th className="py-3 px-4 text-center">Approved</th>
                <th className="py-3 px-4 text-center">In Sprints</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-right">Conversion</th>
                <th className="py-3 px-4 text-right">Pipeline Value</th>
                <th className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {topAmbassadors.length > 0 ? (
                topAmbassadors.map((a: any) => (
                  <tr key={a.userId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{a.ambassadorId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{a.collegeName}</td>
                    <td className="py-3 px-4 text-center">{a.submitted}</td>
                    <td className="py-3 px-4 text-center text-teal-600 font-semibold">{a.approved}</td>
                    <td className="py-3 px-4 text-center text-indigo-600">{a.working}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{a.completed}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900" suppressHydrationWarning>
                      {formatCurrency(a.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600" suppressHydrationWarning>
                      {formatCurrency(a.totalRevenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No ambassador data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
