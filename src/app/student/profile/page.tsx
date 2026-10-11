"use client";

import React, { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import {
  User,
  GraduationCap,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  Mail,
  Building,
  Calendar,
} from "lucide-react";

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    collegeName: "",
    university: "",
    course: "",
    branch: "",
    semester: "",
    ambassadorId: "",
    joiningDate: "",
    status: "",
    referralCode: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          const u = data.user;
          const pr = u.profile || {};
          setProfileData({
            name: u.name || "",
            email: u.email || "",
            phone: pr.phone || "",
            collegeName: pr.collegeName || "",
            university: pr.university || "",
            course: pr.course || "",
            branch: pr.branch || "",
            semester: pr.semester || "",
            ambassadorId: pr.ambassadorId || "N/A",
            joiningDate: pr.joiningDate ? new Date(pr.joiningDate).toLocaleDateString() : "N/A",
            status: u.status || "ACTIVE",
            referralCode: pr.referralCode || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Students may edit their own contact + academic details (identity fields stay admin-only)
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone,
          collegeName: profileData.collegeName,
          university: profileData.university,
          course: profileData.course,
          branch: profileData.branch,
          semester: profileData.semester,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your profile.");
      setMessage("Profile changes saved successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentLayout
      title="Ambassador Profile"
      subtitle="Manage your personal details and academic credentials"
    >
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-only Ambassador Credentials (Requirement 28) */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-base">
                  {profileData.name.slice(0, 2).toUpperCase() || "CA"}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{profileData.name}</h3>
                  <div className="text-xs text-indigo-400 font-mono">
                    ID: {profileData.ambassadorId} &bull; Ref: {profileData.referralCode}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {profileData.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-semibold">Ambassador ID</span>
                <span className="font-mono text-white font-medium">{profileData.ambassadorId}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-semibold">Registered Email</span>
                <span className="text-white truncate block">{profileData.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-semibold">Joining Date</span>
                <span className="text-white">{profileData.joiningDate}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-slate-500 font-semibold">Status</span>
                <span className="text-emerald-400 font-medium">{profileData.status === "ACTIVE" ? "Verified Active" : profileData.status}</span>
              </div>
            </div>
          </div>

          {/* Editable Personal & College Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              College & Academic Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">College / Institute Name</label>
                <input
                  type="text"
                  name="collegeName"
                  value={profileData.collegeName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">University Affiliation</label>
                <input
                  type="text"
                  name="university"
                  value={profileData.university}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Degree / Course</label>
                <input
                  type="text"
                  name="course"
                  value={profileData.course}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Branch / Department</label>
                <input
                  type="text"
                  name="branch"
                  value={profileData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Semester / Year</label>
                <input
                  type="text"
                  name="semester"
                  value={profileData.semester}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Profile Updates"}</span>
            </button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
}
