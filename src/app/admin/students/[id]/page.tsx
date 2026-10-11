"use client";

import { budgetLabel } from "@/lib/format";
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
  UserCheck,
  UserX,
  AlertCircle,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
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

  // Status Toggle State
  const [statusLoading, setStatusLoading] = useState(false);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("Student@12345");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{ password: string } | null>(null);

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

  const handleToggleStatus = async () => {
    if (!data?.student) return;
    setStatusLoading(true);
    const currentStatus = data.student.status;
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      setData((prev: any) => ({
        ...prev,
        student: {
          ...prev.student,
          status: newStatus,
        },
      }));

      setNotice(
        newStatus === "ACTIVE"
          ? `Ambassador ${data.student.name} activated successfully! Login credentials are now active.`
          : `Ambassador ${data.student.name} deactivated. Login credentials are now disabled and will not work.`
      );
    } catch (e: any) {
      alert(e.message || "Failed to update ambassador status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetError("");
    setResetSuccessData(null);
    setCopiedPassword(false);
    setShowNewPassword(false);
    setNewPasswordInput(`Student@${Math.floor(1000 + Math.random() * 9000)}`);
    setShowResetModal(true);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      const res = await fetch(`/api/admin/students/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPasswordInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset password");

      setResetSuccessData({ password: json.password || newPasswordInput.trim() });
      setNotice(`Password successfully updated in database for ${data.student.name}.`);
    } catch (e: any) {
      setResetError(e.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyNewPassword = () => {
    if (!resetSuccessData) return;
    navigator.clipboard.writeText(resetSuccessData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Toggle Button */}
            <button
              type="button"
              disabled={statusLoading}
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                student.status === "ACTIVE"
                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              }`}
              title={
                student.status === "ACTIVE"
                  ? "Click to deactivate ambassador (disables login credentials)"
                  : "Click to activate ambassador (enables login credentials)"
              }
            >
              {statusLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : student.status === "ACTIVE" ? (
                <>
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>Deactivate Ambassador</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Activate Ambassador</span>
                </>
              )}
            </button>

            {/* Reset Password Button */}
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <KeyRound className="w-4 h-4" />
              <span>Reset Password</span>
            </button>
          </div>
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
                  <td className="py-3.5 px-4 font-semibold">{budgetLabel(p)}</td>
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

      {/* Interactive Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Ambassador Password</h3>
                  <p className="text-[11px] text-slate-500">
                    {student.name} • {student.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetSuccessData(null);
                  setResetError("");
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccessData ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium">Password successfully updated in the database!</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Updated Login Credentials
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Email</span>
                      <span className="text-slate-700 font-mono font-medium">{student.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">New Password</span>
                      <span className="font-mono font-bold bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-900 select-all">
                        {resetSuccessData.password}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyNewPassword}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Password</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetSuccessData(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteResetPassword} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-medium text-slate-700">New Password *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(1000 + Math.random() * 9000);
                        setNewPasswordInput(`Student@${rand}`);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password (min. 6 chars)"
                      className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Saves directly to the database. Ambassador can log in immediately.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    {resetLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Updating Database...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Update Password in Database</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

