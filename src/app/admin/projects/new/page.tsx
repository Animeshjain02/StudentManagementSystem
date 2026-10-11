"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
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
import {
  FolderPlus,
  Send,
  ArrowLeft,
  AlertCircle,
  FileText,
  Paperclip,
  X,
  Hash,
  Sparkles,
  Search,
  Building2,
  GraduationCap,
  Check,
} from "lucide-react";

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

export default function AdminNewProjectPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<Required<ProjectFieldValues>>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [projectSource, setProjectSource] = useState<"DIRECT" | "AMBASSADOR">("DIRECT");
  const [directBudget, setDirectBudget] = useState("");
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [ambassadorSearch, setAmbassadorSearch] = useState("");
  const [selectedAmbassador, setSelectedAmbassador] = useState<any | null>(null);
  const [loadingAmbassadors, setLoadingAmbassadors] = useState(false);

  useEffect(() => {
    if (projectSource === "AMBASSADOR" && ambassadors.length === 0) {
      setLoadingAmbassadors(true);
      fetch("/api/admin/students")
        .then((res) => res.json())
        .then((data) => {
          setAmbassadors(data.students || []);
        })
        .catch((err) => console.error("Failed to fetch ambassadors", err))
        .finally(() => setLoadingAmbassadors(false));
    }
  }, [projectSource, ambassadors.length]);

  const filteredAmbassadors = ambassadors.filter((a) => {
    if (!ambassadorSearch.trim()) return true;
    const q = ambassadorSearch.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.collegeName?.toLowerCase().includes(q) ||
      a.ambassadorId?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  const handleSelectAmbassador = (a: any) => {
    setSelectedAmbassador(a);
    setFormData((prev) => ({
      ...prev,
      collegeName: prev.collegeName || (a.collegeName && a.collegeName !== "N/A" ? a.collegeName : ""),
      department: prev.department || (a.branch && a.branch !== "N/A" ? a.branch : ""),
    }));
  };

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

    if (projectSource === "AMBASSADOR" && !selectedAmbassador) {
      setError("Please select a referring campus ambassador from the list or switch to Direct Project.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([k, v]) => body.append(k, v.trim()));
      body.append("source", projectSource);
      body.append("isDirect", projectSource === "DIRECT" ? "true" : "false");
      if (projectSource === "DIRECT" && directBudget.trim()) {
        body.append("expectedBudget", directBudget.trim());
        body.append("approvedBudget", directBudget.trim());
      }
      if (projectSource === "AMBASSADOR" && selectedAmbassador) {
        body.append("studentId", selectedAmbassador.id);
      }
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

      router.push(`/admin/projects/${data.project._id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
    <AdminLayout
      title="Create New Project"
      subtitle="Register a new student/capstone project to initiate review and quotation"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/projects"
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
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

          {/* Project Source / Channel Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Project Channel / Origin</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
              {/* Option 1: Direct */}
              <button
                type="button"
                onClick={() => {
                  setProjectSource("DIRECT");
                  setSelectedAmbassador(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  projectSource === "DIRECT"
                    ? "border-indigo-600 bg-indigo-50/40 text-slate-900 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    projectSource === "DIRECT" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                  }`}
                >
                  {projectSource === "DIRECT" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Direct Project</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Direct client engagement. Skips quotation approvals and advances directly to production.
                  </div>
                </div>
              </button>

              {/* Option 2: Through Ambassador */}
              <button
                type="button"
                onClick={() => setProjectSource("AMBASSADOR")}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  projectSource === "AMBASSADOR"
                    ? "border-indigo-600 bg-indigo-50/40 text-slate-900 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    projectSource === "AMBASSADOR" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                  }`}
                >
                  {projectSource === "AMBASSADOR" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Through Campus Ambassador</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Referred by a registered campus ambassador with performance and commission tracking.
                  </div>
                </div>
              </button>
            </div>

            {/* When "Direct Project" is chosen: Show Project Budget input with placeholder & options */}
            {projectSource === "DIRECT" && (
              <div className="pt-4 border-t border-slate-100 animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Project Budget (₹) <span className="text-slate-400 font-normal">(Direct Deal)</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 font-medium">
                    Reflects directly as approved budget in project info
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={directBudget}
                      onChange={(e) => setDirectBudget(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="e.g. 25000"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  {/* Preset placeholder quick options */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick options:</span>
                    {[15000, 25000, 35000, 50000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDirectBudget(String(amt))}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          directBudget === String(amt)
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        ₹{amt.toLocaleString()}
                      </button>
                    ))}
                    {directBudget && (
                      <button
                        type="button"
                        onClick={() => setDirectBudget("")}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline ml-1 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Since this is a direct engagement, setting a budget here establishes the project budget immediately on the project information and financial tracking summary.</span>
                </p>
              </div>
            )}

            {/* When "Through Ambassador" is chosen: Show Search Bar & Ambassador List with College Names */}
            {projectSource === "AMBASSADOR" && (
              <div className="pt-3 border-t border-slate-100 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Select Referring Campus Ambassador *
                  </label>
                  {selectedAmbassador && (
                    <button
                      type="button"
                      onClick={() => setSelectedAmbassador(null)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                    >
                      Change Ambassador
                    </button>
                  )}
                </div>

                {selectedAmbassador ? (
                  /* Highlighted Selected Ambassador Card */
                  <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {selectedAmbassador.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                            {selectedAmbassador.ambassadorId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-800">{selectedAmbassador.collegeName || "N/A"}</span>
                          <span>•</span>
                          <span className="text-slate-400">{selectedAmbassador.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100/70 px-2.5 py-1 rounded-lg shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Selected</span>
                    </div>
                  </div>
                ) : (
                  /* Search Bar and Scrollable List of Ambassadors with their College Names */
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={ambassadorSearch}
                        onChange={(e) => setAmbassadorSearch(e.target.value)}
                        placeholder="Search ambassador by name, college name, email, or ambassador ID..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-2xs">
                      {loadingAmbassadors ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          Loading registered campus ambassadors...
                        </div>
                      ) : filteredAmbassadors.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No campus ambassadors found matching &quot;{ambassadorSearch}&quot;.
                        </div>
                      ) : (
                        filteredAmbassadors.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => handleSelectAmbassador(a)}
                            className="p-3 hover:bg-indigo-50/50 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{a.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">{a.ambassadorId}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                                <span className="font-medium text-slate-800">{a.collegeName || "N/A"}</span>
                                <span>•</span>
                                <span>{a.email}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-semibold transition-colors shrink-0"
                            >
                              Select
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
              href="/admin/projects"
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
              <span>{submitting ? "Submitting Project..." : "Submit Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
