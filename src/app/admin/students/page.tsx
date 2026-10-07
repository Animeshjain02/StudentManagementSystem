"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FolderGit2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    email: "",
    phone: "",
    collegeName: "",
    university: "",
    course: "B.Tech",
    branch: "Computer Science",
    semester: "6th Semester",
    collegeId: "",
    referralCode: "",
    temporaryPassword: "Student@12345",
  });

  // Reset Password Modal State
  const [resetModalData, setResetModalData] = useState<any>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", String(page));
      params.append("limit", "10");

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudentForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student");

      setShowAddModal(false);
      setNewStudentForm({
        name: "",
        email: "",
        phone: "",
        collegeName: "",
        university: "",
        course: "B.Tech",
        branch: "Computer Science",
        semester: "6th Semester",
        collegeId: "",
        referralCode: "",
        temporaryPassword: "Student@12345",
      });
      fetchStudents();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchStudents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResetSuccessNotice(data.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout
      title="Campus Ambassador Management"
      subtitle="Onboard, review, configure credentials, and manage college ambassador accounts"
    >
      {resetSuccessNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{resetSuccessNotice}</span>
          </div>
          <button onClick={() => setResetSuccessNotice("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, college, or Ambassador ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-200 transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Ambassador</span>
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No ambassadors found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or add a new ambassador.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Ambassador ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">College / University</th>
                  <th className="py-3.5 px-4 text-center">Projects</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {st.ambassadorId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{st.name}</div>
                      <div className="text-[11px] text-slate-400">{st.email} &bull; {st.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{st.collegeName}</div>
                      <div className="text-[11px] text-slate-400">{st.branch} ({st.semester})</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {st.projectCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          st.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            st.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {st.joiningDate ? new Date(st.joiningDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/students/${st.id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleResetPassword(st.id)}
                          className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold"
                          title="Generate temporary password & force change"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(st.id, st.status)}
                          className={`px-2.5 py-1 rounded font-semibold ${
                            st.status === "ACTIVE"
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {st.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal (Requirement 5) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard Campus Ambassador</h3>
                <p className="text-xs text-slate-500">
                  Unique Ambassador ID (CA-2026-XXXX) will be generated automatically.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Personal & Login Credentials
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    placeholder="e.g. Siddharth Rao"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    placeholder="siddharth@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.temporaryPassword}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, temporaryPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-3 border-t border-slate-100">
                College & Branch Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">College Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.collegeName}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, collegeName: e.target.value })
                    }
                    placeholder="e.g. BITS Pilani"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">University</label>
                  <input
                    type="text"
                    value={newStudentForm.university}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, university: e.target.value })
                    }
                    placeholder="e.g. BITS Pilani University"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Course *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.course}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, course: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Branch / Dept *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.branch}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, branch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Semester / Year *</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.semester}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, semester: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">College Roll / ID</label>
                  <input
                    type="text"
                    value={newStudentForm.collegeId}
                    onChange={(e) =>
                      setNewStudentForm({ ...newStudentForm, collegeId: e.target.value })
                    }
                    placeholder="2023CSB1001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {addLoading ? "Creating Student..." : "Create Ambassador Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
