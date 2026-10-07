"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  PlusCircle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Sparkles,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState("");

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      setSeedNotice(json.message || "Database seeded!");
      loadAnalytics();
    } catch (e: any) {
      setSeedNotice(`Seed error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const topAmbassadors = data?.topAmbassadors || [];

  const metricCards = [
    { label: "Total Ambassadors", value: cards.totalAmbassadors || 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Active Ambassadors", value: cards.activeAmbassadors || 0, icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Projects", value: cards.totalProjects || 0, icon: FolderGit2, color: "text-indigo-600 bg-indigo-50" },
    { label: "New Submissions", value: cards.newProjects || 0, icon: FolderGit2, color: "text-amber-600 bg-amber-50" },
    { label: "Under Review", value: cards.projectsUnderReview || 0, icon: FolderGit2, color: "text-orange-600 bg-orange-50" },
    { label: "Quotations Pending", value: cards.quotationsPending || 0, icon: FileSpreadsheet, color: "text-purple-600 bg-purple-50" },
    { label: "Approved Projects", value: cards.approvedProjects || 0, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
    { label: "Working / Sprints", value: cards.workingProjects || 0, icon: PlayCircle, color: "text-indigo-600 bg-indigo-50" },
    { label: "Delivered", value: cards.deliveredProjects || 0, icon: Truck, color: "text-blue-600 bg-blue-50" },
    { label: "Completed Projects", value: cards.completedProjects || 0, icon: Trophy, color: "text-emerald-600 bg-emerald-50" },
    {
      label: "Total Project Value",
      value: `₹${(cards.totalProjectValue || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: "text-slate-900 bg-slate-100",
      highlight: true,
    },
    {
      label: "Payments Received",
      value: `₹${(cards.totalPaymentReceived || 0).toLocaleString()}`,
      icon: CreditCard,
      color: "text-emerald-600 bg-emerald-50",
      highlight: true,
    },
    {
      label: "Pending Receivables",
      value: `₹${(cards.pendingPayment || 0).toLocaleString()}`,
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
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h2>
          <p className="text-xs text-slate-500">Live operational overview of student projects</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>{seeding ? "Seeding..." : "Reseed Demo DB"}</span>
          </button>
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Students</span>
          </Link>
          <Link
            href="/admin/quotations/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-200 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Quotation</span>
          </Link>
        </div>
      </div>

      {seedNotice && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between shadow-2xs">
          <span>{seedNotice}</span>
          <button onClick={() => setSeedNotice("")} className="underline text-indigo-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Cards Grid (Requirement 11) */}
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
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {loading ? "..." : c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Section (Requirement 27) */}
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

      {/* Top Campus Ambassadors Snapshot (Requirement 26) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Campus Ambassador Performance Leaderboard</h3>
            <p className="text-xs text-slate-500">Conversion rate, project pipeline, and delivered value</p>
          </div>
          <Link
            href="/admin/ambassadors"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View Full Table &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Ambassador ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">College</th>
                <th className="py-3 px-4 text-center">Submitted</th>
                <th className="py-3 px-4 text-center">Approved</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Conversion</th>
                <th className="py-3 px-4 text-right">Total Value</th>
                <th className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topAmbassadors.slice(0, 6).map((amb: any) => (
                <tr key={amb.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                    {amb.ambassadorId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{amb.name}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{amb.collegeName}</td>
                  <td className="py-3.5 px-4 text-center font-medium">{amb.submitted}</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{amb.approved}</td>
                  <td className="py-3.5 px-4 text-center text-indigo-600 font-bold">{amb.completed}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[10px]">
                      {amb.conversionRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                    ₹{amb.totalValue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                    ₹{amb.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
