"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  FolderGit2,
  FileSpreadsheet,
  CreditCard,
  History,
  Phone,
  Mail,
  Calendar,
  KeyRound,
  Shield,
  CheckCircle2,
} from "lucide-react";

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStudent = async () => {
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load student");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [id]);

  const handleResetPassword = async () => {
    try {
      const res = await fetch(`/api/admin/students/${id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNotice(json.message);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Student Dossier">
        <div className="p-12 text-center text-xs text-slate-500">Loading student dossier...</div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Student Not Found">
        <div className="p-8 text-center bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
          {error || "Student not found."}
        </div>
      </AdminLayout>
    );
  }

  const { student, projects, quotations, payments, activityLogs, performance } = data;
  const profile = student.profile || {};

  return (
    <AdminLayout
      title={`Ambassador: ${student.name}`}
      subtitle={`Ambassador ID: ${profile.ambassadorId} • ${profile.collegeName}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students List</span>
        </Link>
      </div>

      {notice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Profile Dossier */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{student.name}</h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {profile.ambassadorId}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    student.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {student.email} &bull; {profile.phone} &bull; Joined:{" "}
                {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          <button
            onClick={handleResetPassword}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span>Reset Password</span>
          </button>
        </div>

        {/* Academic Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">College / Institute</span>
            <span className="text-white font-medium">{profile.collegeName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">University</span>
            <span className="text-white">{profile.university || "N/A"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Course & Branch</span>
            <span className="text-white">{profile.course} - {profile.branch}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">Semester / Roll ID</span>
            <span className="text-white">{profile.semester} ({profile.collegeId || "N/A"})</span>
          </div>
        </div>
      </div>

      {/* Performance Summary Cards (Requirement 26) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Projects Submitted</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{performance.totalProjects}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Approved / Active</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{performance.approvedProjects}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Conversion Rate</span>
          <div className="text-xl font-bold text-indigo-600 mt-1">{performance.conversionRate}%</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Pipeline Value</span>
          <div className="text-xl font-bold text-slate-900 mt-1">₹{performance.totalProjectValue.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Revenue Collected</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">₹{performance.totalPaymentsReceived.toLocaleString()}</div>
        </div>
      </div>

      {/* Projects Submitted by this Ambassador */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Projects Referred by this Ambassador ({projects.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Project ID</th>
                <th className="py-3 px-4">Project Title</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Budget</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {projects.map((p: any) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{p.projectId}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">{p.projectName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{p.clientName}</td>
                  <td className="py-3.5 px-4">{p.projectType}</td>
                  <td className="py-3.5 px-4 font-semibold">₹{(p.approvedBudget || p.expectedBudget)?.toLocaleString()}</td>
                  <td className="py-3.5 px-4"><StatusBadge status={p.status} size="sm" /></td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/projects/${p._id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Manage &rarr;
                    </Link>
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
