"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
  Download,
  UserPlus,
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  GraduationCap,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  X,
  Hash,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function AdminAmbassadorsPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    ambassadorId: string;
    collegeName: string;
  } | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    collegeName: "",
    email: "", // Login Email
    phone: "",
    branch: "",
    password: "", // Login Password
    course: "B.Tech",
    semester: "1st Year",
  });

  const fetchAmbassadors = () => {
    setLoading(true);
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAmbassadors();
  }, []);

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghjkmnpqrstuvwxyz";
    const nums = "23456789";
    const prefix = "Ambassador@";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += nums[Math.floor(Math.random() * nums.length)];
    }
    setForm((prev) => ({ ...prev, password: `${prefix}${rand}` }));
  };

  const handleOpenModal = () => {
    setAddError("");
    setCreatedCredentials(null);
    setCopied(false);
    setShowPassword(false);
    setForm({
      name: "",
      collegeName: "",
      email: "",
      phone: "",
      branch: "",
      password: "Student@12345",
      course: "B.Tech",
      semester: "1st Year",
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setCreatedCredentials(null);
    setAddError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);

    try {
      if (!form.name.trim()) throw new Error("Please enter ambassador name.");
      if (!form.collegeName.trim()) throw new Error("Please enter college name.");
      if (!form.branch.trim()) throw new Error("Please enter branch / department.");
      
      // Indian Phone Number validation (valid 10 digits starting with 6, 7, 8, 9)
      const cleanPhone = form.phone.replace(/\D/g, "");
      const normalizedPhone = cleanPhone.length === 12 && cleanPhone.startsWith("91")
        ? cleanPhone.slice(2)
        : cleanPhone.length === 11 && cleanPhone.startsWith("0")
        ? cleanPhone.slice(1)
        : cleanPhone;

      if (!/^[6-9][0-9]{9}$/.test(normalizedPhone)) {
        throw new Error("Phone number must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).");
      }

      if (!form.email.trim()) throw new Error("Please enter login email.");
      if (!form.password.trim() || form.password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: normalizedPhone,
          collegeName: form.collegeName.trim(),
          branch: form.branch.trim(),
          password: form.password.trim(),
          temporaryPassword: form.password.trim(),
          course: form.course.trim() || "B.Tech",
          semester: form.semester.trim() || "1st Year",
          mustChangePassword: false, // Ensure credentials work immediately without forced change
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create ambassador");
      }

      // Success
      setCreatedCredentials({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        ambassadorId: json.student?.ambassadorId || "CA-NEW",
        collegeName: form.collegeName.trim(),
      });

      // Refetch table
      fetchAmbassadors();
    } catch (err: any) {
      setAddError(err.message || "An unexpected error occurred.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Campus Ambassador Login Credentials:
Ambassador ID: ${createdCredentials.ambassadorId}
Name: ${createdCredentials.name}
College: ${createdCredentials.collegeName}
Login Email: ${createdCredentials.email}
Password: ${createdCredentials.password}
Portal URL: ${window.location.origin}/student/login`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const topAmbassadors = data?.topAmbassadors || [];

  return (
    <AdminLayout
      title="Campus Ambassador Performance"
      subtitle="Track college outreach, conversion metrics, student referral pipelines, and revenue attribution"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="text-xs text-slate-500 font-medium">
          {topAmbassadors.length} Registered Campus Ambassadors
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Ambassador</span>
          </button>
          <a
            href="/api/admin/export?type=students"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Ambassadors CSV</span>
          </a>
        </div>
      </div>

      {/* Ambassador Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading ambassador performance...</div>
        ) : topAmbassadors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No ambassador data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Ambassador ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4 text-center">Submitted</th>
                  <th className="py-3.5 px-4 text-center">Approved</th>
                  <th className="py-3.5 px-4 text-center">Working</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Rejected</th>
                  <th className="py-3.5 px-4 text-center">Conversion</th>
                  <th className="py-3.5 px-4 text-right">Project Value</th>
                  <th className="py-3.5 px-4 text-right">Revenue</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {topAmbassadors.map((amb: any) => (
                  <tr key={amb.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {amb.ambassadorId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{amb.name}</div>
                      {amb.email && (
                        <div className="text-[10px] text-slate-400 font-normal">{amb.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      <div>{amb.collegeName}</div>
                      {amb.branch && amb.branch !== "N/A" && (
                        <div className="text-[10px] text-slate-400">{amb.branch}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">{amb.submitted}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{amb.approved}</td>
                    <td className="py-3.5 px-4 text-center text-indigo-600 font-bold">{amb.working}</td>
                    <td className="py-3.5 px-4 text-center text-teal-600 font-bold">{amb.completed}</td>
                    <td className="py-3.5 px-4 text-center text-rose-600 font-medium">{amb.rejected}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {amb.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      ₹{amb.totalValue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      ₹{amb.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/students/${amb.userId}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Profile &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Ambassador Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Campus Ambassador</h3>
                  <p className="text-xs text-slate-500">
                    Register ambassador profile and configure portal login credentials
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {addError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="leading-relaxed">{addError}</span>
              </div>
            )}

            {/* Success State Screen */}
            {createdCredentials ? (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ambassador Account Created Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    The ambassador has been registered and their login credentials are ready to use.
                  </p>
                </div>

                {/* Credentials Card */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Login Credentials Summary
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold text-xs">
                      {createdCredentials.ambassadorId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Ambassador Name</span>
                      <span className="font-semibold text-slate-800">{createdCredentials.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">College</span>
                      <span className="font-semibold text-slate-800">{createdCredentials.collegeName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Login Email</span>
                      <span className="font-mono font-semibold text-indigo-700 select-all">
                        {createdCredentials.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Password</span>
                      <span className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block select-all">
                        {createdCredentials.password}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleCopyCredentials}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Credentials Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Login Credentials</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href="/student/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test Login Portal</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Add Ambassador Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Ambassador Information Group */}
                <div>
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ambassador Profile Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Name */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>

                    {/* College */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        College / Institute Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          required
                          value={form.collegeName}
                          onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                          placeholder="e.g. IIT Bombay / ACEIT"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>

                    {/* Branch */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Branch / Department <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          required
                          value={form.branch}
                          onChange={(e) => setForm({ ...form, branch: e.target.value })}
                          placeholder="e.g. Computer Science & Engg"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                    </div>

                    {/* Phone Number - Indian 10 digits */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Phone Number (India) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden transition-all bg-white">
                        <span className="inline-flex items-center px-2.5 bg-slate-50 border-r border-slate-200 text-slate-600 font-semibold text-xs select-none">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          pattern="[6-9][0-9]{9}"
                          title="10-digit Indian phone number starting with 6, 7, 8, or 9"
                          value={form.phone}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setForm({ ...form, phone: digitsOnly });
                          }}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Valid 10-digit Indian mobile number (starts with 6-9)
                      </p>
                    </div>

                    {/* Course */}
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-slate-700 mb-1">
                        Course / Program
                      </label>
                      <input
                        type="text"
                        value={form.course}
                        onChange={(e) => setForm({ ...form, course: e.target.value })}
                        placeholder="e.g. B.Tech / BCA / MCA"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Login Credentials Section */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Login Credentials (For Ambassador Sign In)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Password</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Login Email */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Login Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="e.g. ambassador@college.edu"
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Will be used to log in at the Ambassador Portal
                      </p>
                    </div>

                    {/* Login Password */}
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Login Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Min. 6 characters"
                          className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Initial password for immediate account access
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {addLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Ambassador...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Ambassador</span>
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
