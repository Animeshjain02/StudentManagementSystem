"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectTimeline } from "@/components/common/ProjectTimeline";
import { PROJECT_STATUSES, ProjectStatus } from "@/lib/constants";
import {
  ArrowLeft,
  FileSpreadsheet,
  PlusCircle,
  Save,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  CreditCard,
  History,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Play,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Truck,
  Mail,
  FolderGit2,
  GraduationCap,
  Building2,
  FileText,
} from "lucide-react";
import { broadcastRealtimeEvent, subscribeToRealtime } from "@/lib/realtime";

/** Percent input that saves once the admin finishes typing (blur / Enter), not on every keystroke. */
function MilestoneProgressInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setDraft(String(value)); // invalid -> revert
      return;
    }
    const rounded = Math.round(n);
    setDraft(String(rounded));
    if (rounded !== value) onCommit(rounded);
  };

  return (
    <input
      type="number"
      min="0"
      max="100"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
    />
  );
}

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "requirements" | "payments" | "activity"
  >("overview");

  // Status and budget editable state
  const [statusVal, setStatusVal] = useState<ProjectStatus>("SUBMITTED");
  const [budgetVal, setBudgetVal] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Propose Budget Quick Form State
  const [proposeBudgetVal, setProposeBudgetVal] = useState("");
  const [proposeDeliveryDate, setProposeDeliveryDate] = useState("");
  const [proposeNotes, setProposeNotes] = useState("");
  const [proposingBudget, setProposingBudget] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  // New Milestone Modal State
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    startDate: "",
    dueDate: "",
    assignedTo: "Engineering Squad Lead",
    status: "PENDING",
  });
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneError, setMilestoneError] = useState("");

  // Add Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "",
    notes: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const loadProject = async (isStale: () => boolean = () => false, resetForm = true) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (isStale()) return;
      if (!res.ok) throw new Error(data.error || "Failed to load project");
      setProjectData(data);
      if (resetForm) {
        setStatusVal(data.project.status);
        setBudgetVal(data.project.approvedBudget || data.project.expectedBudget || "");
        setProposeBudgetVal(data.project.approvedBudget || data.project.expectedBudget || "");
        if (data.project.expectedDeliveryDate) {
          setProposeDeliveryDate(new Date(data.project.expectedDeliveryDate).toISOString().split("T")[0]);
        }
        setProposeNotes(data.project.notes || "");
      }
    } catch (e: any) {
      if (!isStale()) setError(e.message);
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadProject(() => cancelled, true);

    const unsubscribe = subscribeToRealtime((payload) => {
      if (!payload.projectId || payload.projectId === id) {
        loadProject(() => cancelled, false);
      }
    });

    const interval = setInterval(() => {
      loadProject(() => cancelled, false);
    }, 2500);

    const onFocus = () => loadProject(() => cancelled, false);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [id]);

  const handleProposeBudget = async (e?: React.FormEvent, customBudget?: number) => {
    if (e) e.preventDefault();
    const budgetToUse = customBudget !== undefined ? customBudget : Number(proposeBudgetVal);
    if (!budgetToUse || budgetToUse <= 0) {
      alert("Please enter a valid positive budget amount.");
      return;
    }
    setProposingBudget(true);
    setSaveNotice("");
    try {
      const res = await fetch(`/api/projects/${id}/propose-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: budgetToUse,
          deliveryDate: proposeDeliveryDate || undefined,
          notes: proposeNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveNotice(data.message || "Proposed budget sent to student successfully!");
      broadcastRealtimeEvent({
        type: "BUDGET_PROPOSED",
        projectId: id,
        timestamp: Date.now(),
      });
      await loadProject(undefined, true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProposingBudget(false);
    }
  };

  const handleAdvanceStatus = async (targetStatus: ProjectStatus) => {
    setAdvancingStatus(true);
    setSaveNotice("");
    try {
      const res = await fetch(`/api/projects/${id}/advance-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveNotice(data.message || `Status advanced to ${targetStatus.replace(/_/g, " ")}`);
      broadcastRealtimeEvent({
        type: "STATUS_CHANGED",
        projectId: id,
        status: targetStatus,
        timestamp: Date.now(),
      });
      await loadProject(undefined, true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdvancingStatus(false);
    }
  };

  const handleUpdateStatusAndBudget = async () => {
    setSavingStatus(true);
    setSaveNotice("");
    try {
      const payload: Record<string, unknown> = { status: statusVal };

      // Only send the budget when the admin actually changed it. Otherwise a plain status change would
      // silently "approve" the student's expected budget (or wipe it when the field is empty).
      const currentBudget = projectData.project.approvedBudget ?? projectData.project.expectedBudget ?? 0;
      if (budgetVal !== "" && Number(budgetVal) !== currentBudget) {
        const n = Number(budgetVal);
        if (!Number.isFinite(n) || n < 0) throw new Error("Approved budget must be a non-negative number.");
        payload.approvedBudget = n;
      }

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveNotice("Project status & budget updated successfully!");
      broadcastRealtimeEvent({
        type: "PROJECT_UPDATED",
        projectId: id,
        timestamp: Date.now(),
      });
      loadProject();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setMilestoneError("");
    if (milestoneForm.dueDate < milestoneForm.startDate) {
      setMilestoneError("The due date cannot be earlier than the start date.");
      return;
    }
    setMilestoneLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestoneForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowMilestoneModal(false);
      setMilestoneForm({
        name: "",
        description: "",
        startDate: "",
        dueDate: "",
        assignedTo: "Engineering Squad Lead",
        status: "PENDING",
      });
      loadProject(undefined, false);
    } catch (err: any) {
      setMilestoneError(err.message);
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleUpdateMilestone = async (mId: string, updates: any) => {
    try {
      const res = await fetch(`/api/milestones/${mId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not update the milestone.");
      }
      loadProject(undefined, false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMilestone = async (mId: string, name: string) => {
    if (!window.confirm(`Remove milestone "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/milestones/${mId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not remove the milestone.");
      }
      loadProject(undefined, false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectData.project._id,
          ...paymentForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowPaymentModal(false);
      setPaymentForm({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "Bank Transfer",
        transactionReference: "",
        notes: "",
      });
      broadcastRealtimeEvent({
        type: "PAYMENT_RECORDED",
        projectId: id,
        timestamp: Date.now(),
      });
      loadProject(undefined, false);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Project Details">
        <div className="p-12 text-center text-xs text-slate-500">Loading project...</div>
      </AdminLayout>
    );
  }

  if (error || !projectData) {
    return (
      <AdminLayout title="Project Not Found">
        <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
          <p className="text-sm font-semibold">{error || "Project could not be found."}</p>
        </div>
      </AdminLayout>
    );
  }

  const { project, milestones, quotations, payments, activityLogs, financials, documents } = projectData;
  const isDirect = Boolean(project.isDirect || project.source === "DIRECT");
  const availableStatuses = isDirect
    ? PROJECT_STATUSES.filter((st) => st !== "QUOTATION_SENT" && st !== "CHANGES_REQUESTED" && st !== "AWAITING_APPROVAL")
    : PROJECT_STATUSES;

  return (
    <AdminLayout
      title={`Manage Project: ${project.projectId}`}
      subtitle={`${project.projectName} • Client: ${project.clientName}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {saveNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button onClick={() => setSaveNotice("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner with Workflow Status Controller */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-sm mb-6 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2.5 max-w-2xl min-w-0">
            {/* Project ID */}
            <div>
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/80 inline-flex items-center gap-1.5 shrink-0">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{project.projectId}</span>
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                {project.projectName}
              </h1>

              {/* Client & Ambassador Info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                {!isDirect ? (
                  <>
                    <span>Ambassador: <strong className="text-slate-800 font-semibold">{project.studentId?.name || "Student"}</strong></span>
                    <span className="text-slate-300">•</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                      Direct Project
                    </span>
                    <span className="text-slate-300">•</span>
                  </>
                )}
                <span>Client: <strong className="text-slate-800 font-semibold">{project.clientName}</strong></span>
                {project.collegeName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{project.collegeName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Financial Summary - Sleek 3-Column Single Row Strip */}
            <div className="pt-1">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 grid grid-cols-3 divide-x divide-slate-200 text-center sm:text-left max-w-xs sm:max-w-md shadow-2xs">
                <div className="px-2 sm:px-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Budget
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 block mt-0.5 truncate">
                    ₹{(project.approvedBudget || project.expectedBudget || 0).toLocaleString()}
                  </span>
                </div>

                <div className="px-2 sm:px-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                    Paid
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-600 block mt-0.5 truncate">
                    ₹{(financials?.totalPaid || 0).toLocaleString()}
                  </span>
                </div>

                <div className="px-2 sm:px-3">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">
                    Due
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-600 block mt-0.5 truncate">
                    ₹{(financials?.pendingPayment || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* FLUENT WORKFLOW PIPELINE CONTROLLER */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          {isDirect ? (
            /* DIRECT PROJECT FLOW: Quotation and student approval are skipped */
            <>
              {(project.status === "SUBMITTED" || project.status === "UNDER_REVIEW" || project.status === "APPROVED") && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-50 via-teal-50 to-emerald-50 border border-indigo-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-2">
                        <span>Direct Project: Ready for Development</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold">
                          Direct Client
                        </span>
                      </div>
                      <p className="text-xs text-indigo-800 font-medium mt-0.5">
                        This is a direct project. Quotation approval is skipped. Set the approved budget above and advance directly to active development.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdvanceStatus("IN_PROGRESS")}
                    disabled={advancingStatus}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{advancingStatus ? "Starting..." : "Start Development (Move to In Progress)"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* AMBASSADOR PROJECT FLOW (Unchanged): Quotation sent and student approval */
            <>
              {/* STAGE 1: SUBMITTED or UNDER_REVIEW -> Propose Budget */}
              {(project.status === "SUBMITTED" || project.status === "UNDER_REVIEW") && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Next Step: Propose Project Budget & Send to Student
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          Formulate the commercial budget and dispatch to student. They can approve or decline directly on their panel.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/quotations/new?projectId=${project._id}`}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline self-start md:self-auto"
                    >
                      Create itemized quotation &rarr;
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-end gap-3 mt-2 bg-white/70 p-3 rounded-lg border border-amber-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Proposed Budget (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 15000"
                        value={proposeBudgetVal}
                        onChange={(e) => setProposeBudgetVal(e.target.value)}
                        className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Target Delivery Date
                      </label>
                      <input
                        type="date"
                        value={proposeDeliveryDate}
                        onChange={(e) => setProposeDeliveryDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Proposal Scope / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Full source code, deployment, documentation included"
                        value={proposeNotes}
                        onChange={(e) => setProposeNotes(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <button
                      onClick={handleProposeBudget}
                      disabled={proposingBudget}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{proposingBudget ? "Sending..." : "Send Budget to Student"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: QUOTATION_SENT -> Awaiting Student Approval */}
              {project.status === "QUOTATION_SENT" && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Stage 2: Budget Sent &bull; Awaiting Student Approval
                      </div>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Proposed budget of <strong>₹{(project.approvedBudget || 0).toLocaleString()}</strong> sent to student {project.studentId?.name || ""}. The student has options to <strong>Approve</strong> or <strong>Decline</strong> on their dashboard.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      onClick={() => {
                        const newB = prompt("Enter revised budget amount (₹):", String(project.approvedBudget || ""));
                        if (newB && Number(newB) > 0) {
                          setProposeBudgetVal(newB);
                          handleProposeBudget(undefined, Number(newB));
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold cursor-pointer"
                    >
                      Revise Budget
                    </button>
                  </div>
                </div>
              )}

              {/* CHANGES_REQUESTED -> Student declined or asked for revision */}
              {project.status === "CHANGES_REQUESTED" && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Student Requested Budget Adjustments
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        The student has declined the initial budget or requested scope adjustments. You can enter an updated proposal below.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const newB = prompt("Enter revised budget amount (₹):", String(project.approvedBudget || ""));
                      if (newB && Number(newB) > 0) {
                        setProposeBudgetVal(newB);
                        handleProposeBudget(undefined, Number(newB));
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Send Revised Budget &rarr;
                  </button>
                </div>
              )}

              {/* STAGE 3: APPROVED -> Student Approved Budget! Kickoff Development */}
              {project.status === "APPROVED" && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                        <span>Stage 3 Complete: Budget Approved!</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px]">
                          Student Confirmed
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        Student accepted <strong>₹{(project.approvedBudget || 0).toLocaleString()}</strong>. Click below to begin development and advance stage to <strong>In Progress</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdvanceStatus("IN_PROGRESS")}
                    disabled={advancingStatus}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{advancingStatus ? "Starting..." : "Start Development (Move to In Progress)"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* STAGE 4: IN_PROGRESS / WORKING -> Mark Completed */}
          {(project.status === "IN_PROGRESS" || project.status === "WORKING") && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Stage 4: Active Development In Progress
                  </div>
                  <p className="text-xs text-indigo-800 font-medium mt-0.5">
                    Engineering squad is building deliverables. When testing passes, mark development as completed.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAdvanceStatus("COMPLETED")}
                disabled={advancingStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{advancingStatus ? "Updating..." : "Mark Completed (Move to Stage 5)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STAGE 5: COMPLETED -> Move to Payment */}
          {project.status === "COMPLETED" && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Stage 5: Development Completed ✓
                  </div>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    Features tested and ready. Advance to Payment stage to request final settlement from student/client.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAdvanceStatus("PAYMENT_PENDING")}
                disabled={advancingStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>{advancingStatus ? "Updating..." : "Request Payment (Move to Stage 6)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STAGE 6: PAYMENT_PENDING -> Mark Delivered */}
          {project.status === "PAYMENT_PENDING" && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                    Stage 6: Payment Pending
                  </div>
                  <div className="text-sm font-bold text-teal-900 mt-0.5">
                    Payment Due = ₹{(financials?.pendingPayment || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAdvanceStatus("DELIVERED")}
                disabled={advancingStatus}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all self-start md:self-auto cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>{advancingStatus ? "Delivering..." : "Mark Delivered (Complete Project)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STAGE 7: DELIVERED -> Done */}
          {(project.status === "DELIVERED" || project.status === "READY_FOR_DELIVERY") && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Stage 7: Project Delivered & Finished 🏁
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    This project has been successfully completed, verified, and delivered to the student and campus client.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visual Workflow Timeline Bar */}
        <div className="mt-6 pt-2">
          <ProjectTimeline
            currentStatus={project.status}
            startDate={project.startDate}
            expectedDeliveryDate={project.expectedDeliveryDate}
            isDirect={isDirect}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      {/* Desktop / Tablet Modern Segmented Bar (hidden sm:flex) */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-6 text-xs font-medium">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "requirements", label: "Requirements", icon: FileText },
          { id: "payments", label: "Payments", count: payments.length, icon: CreditCard },
          { id: "activity", label: "Activity", count: activityLogs.length, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Redesigned Touch Grid (sm:hidden) - ZERO SLIDER, ZERO HORIZONTAL SCROLL */}
      <div className="sm:hidden mb-6 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 grid grid-cols-4 gap-1 text-xs">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "requirements", label: "Reqs", icon: FileText },
          { id: "payments", label: "Payments", count: payments.length, icon: CreditCard },
          { id: "activity", label: "Activity", count: activityLogs.length, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-lg font-semibold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer truncate ${
                isActive
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-1">
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                {typeof tab.count === "number" && (
                  <span
                    className={`text-[9px] px-1 rounded-full font-bold ${
                      isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Project Description</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Assigned Engineering Squad</h3>
              <div className="flex flex-wrap gap-2">
                {project.assignedTeam?.length > 0 ? (
                  project.assignedTeam.map((m: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No squad members assigned yet.</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client & Referral Info
              </h3>
              <div>
                <span className="text-slate-500 block">Client Contact:</span>
                <span className="font-semibold text-slate-800">{project.clientName}</span>
                <span className="text-slate-500 block">{project.clientEmail}</span>
                <span className="text-slate-500 block">{project.clientPhone}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                {!isDirect ? (
                  <>
                    <span className="text-slate-500 block">Ambassador:</span>
                    <span className="font-semibold text-slate-800">{project.studentId?.name}</span>
                    <span className="text-slate-500 block">{project.studentId?.email}</span>
                    <span className="text-slate-500 block">{project.collegeName}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500 block">Project Source:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                      Direct Client (In-House)
                    </span>
                  </>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Project Budget:</span>
                <span className="font-bold text-slate-900">
                  ₹{(project.approvedBudget || project.expectedBudget || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Requirements */}
      {activeTab === "requirements" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Functional Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.functionalRequirements || "None specified"}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Technical Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.technicalRequirements || "None specified"}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Expected Features</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.expectedFeatures || "None specified"}
            </div>
          </div>
          {documents?.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-2">Attached Documents</h4>
              <div className="flex flex-col gap-2">
                {documents.map((d: any) => (
                  <div key={d._id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{d.fileName}</div>
                      <div className="text-[11px] text-slate-400">
                        PDF &bull; {(d.fileSize / 1024).toFixed(0)} KB &bull; {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 font-semibold">
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        View
                      </a>
                      <a href={`${d.fileUrl}?download=1`} className="text-slate-600 hover:underline">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.requirements?.referenceLinks && (
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-2">Reference Links</h4>
              <div className="flex flex-col gap-1.5">
                {String(project.requirements.referenceLinks)
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((link: string, i: number) =>
                    /^https?:\/\//i.test(link) ? (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                        {link}
                      </a>
                    ) : (
                      <span key={i} className="text-slate-600 break-all">
                        {link}
                      </span>
                    )
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payments (Requirement 24) */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Budget</span>
                <span className="font-bold text-base text-slate-900">
                  ₹{(financials?.totalBudget || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Paid</span>
                <span className="font-bold text-base text-emerald-600">
                  ₹{(financials?.totalPaid || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Pending Balance</span>
                <span className="font-bold text-base text-amber-600">
                  ₹{(financials?.pendingPayment || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentError("");
                setShowPaymentModal(true);
              }}
              disabled={financials?.totalBudget > 0 && financials?.pendingPayment <= 0}
              title={financials?.totalBudget > 0 && financials?.pendingPayment <= 0 ? "This project is fully paid" : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{financials?.totalBudget > 0 && financials?.pendingPayment <= 0 ? "Fully Paid" : "Record New Payment"}</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No payments recorded yet.
            </div>
          ) : (
            <>
              {/* Mobile View: Clean Card List - Zero Slider */}
              <div className="block md:hidden space-y-2.5">
                {payments.map((p: any) => (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        ₹{p.amount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/50">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold">
                        {p.paymentMethod}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                        Ref: {p.transactionReference}
                      </span>
                    </div>
                    {p.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-0.5">
                        Note: {p.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet View: Full Width Table Without Horizontal Scroll Slider */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-1/5">Date</th>
                      <th className="py-2.5 px-3 w-1/5">Amount</th>
                      <th className="py-2.5 px-3 w-1/5">Method</th>
                      <th className="py-2.5 px-3 w-1/5">Transaction Reference</th>
                      <th className="py-2.5 px-3 w-1/5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payments.map((p: any) => (
                      <tr key={p._id}>
                        <td className="py-3 px-3 text-slate-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">₹{p.amount?.toLocaleString()}</td>
                        <td className="py-3 px-3">{p.paymentMethod}</td>
                        <td className="py-3 px-3 font-mono text-slate-800 break-all">{p.transactionReference}</td>
                        <td className="py-3 px-3 text-slate-600 break-words">{p.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Activity Logs */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">
            Immutable Audit Trail & Project Activity
          </h4>
          <div className="space-y-4 text-xs">
            {activityLogs.map((log: any) => (
              <div key={log._id} className="flex items-start gap-3 pb-3 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{log.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString()} &bull; Role: {log.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Milestone (Requirement 23) */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Project Milestone</h3>
            <p className="text-xs text-slate-500 mb-4">Define sprint deliverable with target completion date.</p>

            {milestoneError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{milestoneError}</span>
              </div>
            )}

            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Milestone Name *</label>
                <input
                  type="text"
                  required
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  placeholder="e.g. Backend API Architecture & RBAC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={milestoneForm.startDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    min={milestoneForm.startDate || undefined}
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Person / Role</label>
                <input
                  type="text"
                  value={milestoneForm.assignedTo}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={milestoneLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {milestoneLoading ? "Creating..." : "Save Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Payment (Requirement 24) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Record Payment Received</h3>
            <p className="text-xs text-slate-500 mb-4">
              Remaining pending balance:{" "}
              <strong className="text-amber-700">₹{(financials?.pendingPayment || 0).toLocaleString()}</strong>
            </p>

            {paymentError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={financials?.pendingPayment || undefined}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="25000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>



              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Advance 50% payment verified"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {paymentLoading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
