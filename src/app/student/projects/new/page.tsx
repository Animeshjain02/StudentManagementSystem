"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { PROJECT_TYPES } from "@/lib/constants";
import {
  MAX_PDF_BYTES,
  validatePdfFile,
  validateProjectFields,
  formatCollegeCode,
  formatBranchCode,
  generateProjectId,
  type FieldErrors,
  type ProjectFieldValues,
} from "@/lib/field-rules";
import { FolderPlus, Send, ArrowLeft, AlertCircle, FileText, Paperclip, X, Hash, Sparkles } from "lucide-react";

const INPUT =
  "w-full px-3 py-2 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2";
const ok = "border-slate-300 focus:ring-indigo-500";
const bad = "border-rose-400 focus:ring-rose-400 bg-rose-50/40";

const EMPTY: Required<ProjectFieldValues> = {
  projectName: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  collegeName: "",
  department: "",
  projectType: "Software",
  description: "",
  functionalRequirements: "",
  technicalRequirements: "",
  expectedFeatures: "",
  referenceLinks: "",
};

export default function NewProjectPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Required<ProjectFieldValues>>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const collegeCode = formatCollegeCode(formData.collegeName);
  const branchCode = formatBranchCode(formData.department);
  const phoneDigits = formData.clientPhone.replace(/\D/g, "");
  const phoneLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits;
  const isProjectIdReady = Boolean(collegeCode && branchCode && phoneDigits.length >= 4);
  const computedProjectId = generateProjectId(formData.collegeName, formData.department, formData.clientPhone);

  const validate = (values = formData, pdf = file): FieldErrors => {
    const e = validateProjectFields(values, PROJECT_TYPES);
    if (pdf) {
      const fe = validatePdfFile(pdf);
      if (fe) e.document = fe;
    }
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === "clientPhone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    const next = { ...formData, [e.target.name]: value };
    setFormData(next);
    if (touched[e.target.name]) setErrors(validate(next));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
    setErrors(validate());
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
    setTouched((t) => ({ ...t, document: true }));
    setErrors(validate(formData, picked));
  };

  const clearFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setErrors(validate(formData, null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const found = validate();
    setErrors(found);
    setTouched(Object.fromEntries([...Object.keys(EMPTY), "document"].map((k) => [k, true])));
    const first = Object.keys(found)[0];
    if (first) {
      setError("Please fix the highlighted fields and try again.");
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([k, v]) => body.append(k, v.trim()));
      if (isProjectIdReady && computedProjectId) {
        body.append("projectId", computedProjectId);
      }
      if (file) body.append("document", file);

      const res = await fetch("/api/projects", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        throw new Error(data.error || "Failed to submit project");
      }

      router.push(`/student/projects/${data.project._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // The line is always rendered (fixed height) so an error appearing on blur never shifts the layout,
  // which would otherwise move the Submit button out from under the cursor and swallow the click.
  const fieldError = (name: keyof FieldErrors) => {
    const message = errors[name] && touched[name] ? errors[name] : "";
    return (
      <p className="mt-1 min-h-[1rem] text-[11px] leading-4 text-rose-600" role={message ? "alert" : undefined}>
        {message}
      </p>
    );
  };
  const cls = (name: keyof FieldErrors) => `${INPUT} ${errors[name] && touched[name] ? bad : ok}`;

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

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Project ID Section (Auto-Generated) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Project ID</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full w-fit">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Auto-assigned by System
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  System Generated Project Identifier
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm font-bold tracking-wider text-indigo-700 flex items-center justify-between">
                    <span>{computedProjectId || "COLLEGE-BRANCH-XXXX"}</span>
                    <span
                      className={`text-[10px] font-medium font-sans px-2 py-0.5 rounded-full ${
                        isProjectIdReady
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isProjectIdReady ? "Active ID" : "Auto-generating..."}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Format: <span className="font-mono text-slate-600 font-medium">[College]-[Branch]-[Last 4 digits of phone]</span> (e.g. <span className="font-mono text-indigo-600 font-semibold">ACEIT-CS-8976</span>)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-slate-600">
                <div className="font-semibold text-slate-800 mb-1">Live Segment Values:</div>
                <ul className="space-y-0.5 text-slate-500">
                  <li className="flex justify-between">
                    <span>College:</span>
                    <span className="font-mono font-semibold text-slate-700">{collegeCode || "—"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Branch:</span>
                    <span className="font-mono font-semibold text-slate-700">{branchCode || "—"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Phone End 4:</span>
                    <span className="font-mono font-semibold text-slate-700">{phoneLast4 || "—"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 1: Client & College Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Client & College Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Client / Student Name *</label>
                <input
                  type="text"
                  name="clientName"
                  maxLength={80}
                  value={formData.clientName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Rahul Sharma"
                  className={cls("clientName")}
                />
                {fieldError("clientName")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Client Email Address *</label>
                <input
                  type="email"
                  name="clientEmail"
                  maxLength={254}
                  value={formData.clientEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="student@college.edu"
                  className={cls("clientEmail")}
                />
                {fieldError("clientEmail")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Client Contact Number *</label>
                <input
                  type="tel"
                  name="clientPhone"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="9876543210"
                  className={cls("clientPhone")}
                />
                {fieldError("clientPhone")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Project Type / Category *</label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`${cls("projectType")} bg-white`}
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {fieldError("projectType")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">College / Institute Name</label>
                <input
                  type="text"
                  name="collegeName"
                  maxLength={120}
                  value={formData.collegeName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. IIT Delhi"
                  className={cls("collegeName")}
                />
                {fieldError("collegeName")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Branch / Department</label>
                <input
                  type="text"
                  name="department"
                  maxLength={100}
                  value={formData.department}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Computer Science & Engineering"
                  className={cls("department")}
                />
                {fieldError("department")}
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
                <label className="block font-medium text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  name="projectName"
                  maxLength={120}
                  value={formData.projectName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. AI-Powered Autonomous Campus Rover"
                  className={cls("projectName")}
                />
                {fieldError("projectName")}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Project Description / Problem Statement * <span className="text-slate-400 font-normal">(min 20 characters)</span>
                </label>
                <textarea
                  rows={5}
                  name="description"
                  maxLength={5000}
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Provide an overview of the project objectives, target users, and key problems it solves..."
                  className={cls("description")}
                />
                {fieldError("description")}
              </div>
            </div>
          </div>

          {/* Card 3: PDF upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Project Document (PDF)</h3>
            </div>

            <div className="text-xs">
              <label className="block font-medium text-slate-700 mb-1">
                Upload synopsis / requirement document <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                ref={fileInput}
                type="file"
                name="document"
                accept="application/pdf,.pdf"
                onChange={handleFile}
                className="block w-full text-xs text-slate-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                PDF only, up to {MAX_PDF_BYTES / 1024 / 1024} MB. Helps our architects prepare an accurate quotation.
              </p>
              {file && !errors.document && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                  <button type="button" onClick={clearFile} title="Remove file" className="text-slate-400 hover:text-rose-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {errors.document && touched.document && (
                <p className="mt-1 text-[11px] text-rose-600" role="alert">
                  {errors.document}{" "}
                  {file && (
                    <button type="button" onClick={clearFile} className="underline">
                      Remove file
                    </button>
                  )}
                </p>
              )}
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
