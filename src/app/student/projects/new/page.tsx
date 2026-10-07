"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { PROJECT_TYPES } from "@/lib/constants";
import {
  FolderPlus,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  User,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    collegeName: "",
    department: "",
    projectType: "Web Application",
    description: "",
    functionalRequirements: "",
    technicalRequirements: "",
    expectedFeatures: "",
    referenceLinks: "",
    expectedBudget: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.projectName || !formData.clientName || !formData.clientEmail || !formData.description || !formData.expectedBudget) {
      setError("Please fill out all required fields marked with an asterisk (*).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit project");
      }

      router.push(`/student/projects/${data.project._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout
      title="Submit New College Project"
      subtitle="Register a new student/capstone project to initiate review and quotation"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/student/projects"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Project & Client Basics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Project & Client Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  name="projectName"
                  required
                  value={formData.projectName}
                  onChange={handleChange}
                  placeholder="e.g. AI-Powered Autonomous Campus Rover"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Client / Student Name *
                </label>
                <input
                  type="text"
                  name="clientName"
                  required
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Client Email Address *
                </label>
                <input
                  type="email"
                  name="clientEmail"
                  required
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="student@college.edu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Client Contact Number
                </label>
                <input
                  type="text"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Project Type / Category *
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  College / Institute Name
                </label>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. IIT Delhi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Branch / Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Requirements Specification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Project Requirements & Scope</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Project Description / Problem Statement *
                </label>
                <textarea
                  rows={4}
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide an overview of the project objectives, target users, and key problems it solves..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Functional Requirements
                </label>
                <textarea
                  rows={3}
                  name="functionalRequirements"
                  value={formData.functionalRequirements}
                  onChange={handleChange}
                  placeholder="e.g. User authentication, admin dashboard, automated alerts, payment gateway..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Technical Requirements / Tech Stack Preferences
                </label>
                <textarea
                  rows={2}
                  name="technicalRequirements"
                  value={formData.technicalRequirements}
                  onChange={handleChange}
                  placeholder="e.g. React/Next.js, Python FastAPI, TensorFlow, PostgreSQL/MongoDB..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Expected Features & Deliverables
                </label>
                <textarea
                  rows={2}
                  name="expectedFeatures"
                  value={formData.expectedFeatures}
                  onChange={handleChange}
                  placeholder="e.g. Final code repository, project report/synopsis, IEEE paper template, deployment on Vercel..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Reference Links / Repositories
                </label>
                <input
                  type="text"
                  name="referenceLinks"
                  value={formData.referenceLinks}
                  onChange={handleChange}
                  placeholder="https://github.com/... or Google Drive documentation link"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Budget */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Commercial Expectation</h3>
            </div>

            <div className="max-w-xs text-xs">
              <label className="block font-medium text-slate-700 mb-1">
                Expected Student/Client Budget (INR) *
              </label>
              <div className="relative rounded-lg shadow-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  name="expectedBudget"
                  required
                  min="1000"
                  value={formData.expectedBudget}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Our architects will formulate a formal line-item quotation based on this benchmark.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/student/projects"
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Submitting Project..." : "Submit Project for Review"}</span>
            </button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
}
