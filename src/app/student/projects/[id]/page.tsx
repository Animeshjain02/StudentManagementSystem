"use client";

import { budgetLabel } from "@/lib/format";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectTimeline } from "@/components/common/ProjectTimeline";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  CreditCard,
  History,
  FileText,
  User,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Mail,
  FolderGit2,
  GraduationCap,
  Building2,
} from "lucide-react";
import { broadcastRealtimeEvent, subscribeToRealtime } from "@/lib/realtime";

export default function StudentProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectData, setProjectData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "requirements" | "payments" | "activity"
  >("overview");

  // Budget Approval / Decline Modals & State
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProject = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load project");
      }
      setProjectData(data);
    } catch (err: any) {
      if (showSpinner) setError(err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadProject(true);

    // Cross-tab realtime event listener
    const unsubscribe = subscribeToRealtime((payload) => {
      if (!payload.projectId || payload.projectId === id) {
        loadProject(false);
      }
    });

    // High responsiveness polling every 2.5 seconds
    const interval = setInterval(() => {
      loadProject(false);
    }, 2500);

    const onFocus = () => loadProject(false);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [id]);

  const handleApproveBudget = async () => {
    setActionLoading(true);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/projects/${id}/approve-budget`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAcceptModal(false);
      setActionNotice({
        type: "success",
        text: "Budget officially approved! Project status is now APPROVED. Our team will begin development.",
      });
      broadcastRealtimeEvent({
        type: "BUDGET_APPROVED",
        projectId: id,
        timestamp: Date.now(),
      });
      await loadProject(false);
    } catch (err: any) {
      setActionNotice({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBudget = async () => {
    if (!declineReason.trim()) {
      alert("Please provide feedback or the reason for declining.");
      return;
    }
    setActionLoading(true);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/projects/${id}/decline-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowDeclineModal(false);
      setDeclineReason("");
      setActionNotice({
        type: "success",
        text: "Your feedback has been sent to Admin. They will review and provide a revised budget.",
      });
      broadcastRealtimeEvent({
        type: "BUDGET_DECLINED",
        projectId: id,
        timestamp: Date.now(),
      });
      await loadProject(false);
    } catch (err: any) {
      setActionNotice({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout title="Project Details">
        <div className="p-12 text-center text-xs text-slate-500">Loading project details...</div>
      </StudentLayout>
    );
  }

  if (error || !projectData) {
    return (
      <StudentLayout title="Project Not Found">
        <div className="max-w-xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="font-bold text-sm">Access Denied or Not Found</h3>
          <p className="text-xs mt-1 text-rose-700">{error || "Could not retrieve project data."}</p>
          <Link
            href="/student/projects"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
          >
            Back to My Projects
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const { project, milestones, quotations, payments, activityLogs, financials, documents } = projectData;
  const activeQuotation = quotations?.[0]; // latest version

  return (
    <StudentLayout
      title={`${project.projectName}`}
      subtitle={`Project ID: ${project.projectId} • Submitted by Campus Ambassador`}
    >
      <div className="mb-4">
        <Link
          href="/student/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Projects</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-sm mb-6 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <div className="flex flex-col gap-4 text-left">
          <div className="space-y-2.5 max-w-3xl min-w-0">
            {/* Project ID */}
            <div>
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/80 inline-flex items-center gap-1.5 shrink-0">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{project.projectId}</span>
              </span>
            </div>

            {/* Title & Clean Metadata */}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                {project.projectName}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
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
                    {budgetLabel(project)}
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

        {/* Visual Workflow Timeline Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <ProjectTimeline
            currentStatus={project.status}
            startDate={project.startDate}
            expectedDeliveryDate={project.expectedDeliveryDate}
          />
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
            actionNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs font-semibold underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 2: FLUENT BUDGET APPROVAL BANNER (When Admin has sent budget) */}
      {(project.status === "QUOTATION_SENT" ||
        project.status === "UNDER_REVIEW" ||
        ["SENT", "VIEWED"].includes(activeQuotation?.status)) && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 shadow-md border border-indigo-700/50 relative overflow-hidden animate-in fade-in-50 duration-200">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold uppercase tracking-wider mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Student Ambassador Approval &bull; Budget Proposal Received
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Admin Has Sent the Project Budget
              </h3>
              <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                As the Student Ambassador who created this project, review the proposed commercial budget and expected delivery timeline below. Once approved by you, the project officially advances to <strong>Approval</strong> and our team will initiate development.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">Proposed Budget</span>
                  <span className="text-lg font-extrabold text-white">
                    ₹{(project.approvedBudget || activeQuotation?.total || project.expectedBudget || 0).toLocaleString()}
                  </span>
                </div>

                {(project.expectedDeliveryDate || activeQuotation?.deliveryTimeline) && (
                  <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Delivery Timeline</span>
                    <span className="text-sm font-semibold text-white">
                      {project.expectedDeliveryDate
                        ? new Date(project.expectedDeliveryDate).toLocaleDateString()
                        : activeQuotation?.deliveryTimeline}
                    </span>
                  </div>
                )}

                {project.notes && (
                  <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/15 max-w-xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Admin Notes</span>
                    <span className="text-xs text-indigo-100 line-clamp-1">{project.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-300" />
                <span>Decline / Adjust</span>
              </button>

              <button
                onClick={() => setShowAcceptModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Approve Budget & Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: APPROVED BANNER */}
      {project.status === "APPROVED" && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Stage 3: Budget Approved
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                Budget of <strong>₹{(project.approvedBudget || financials?.totalBudget || 0).toLocaleString()}</strong> has been approved! Engineering team is preparing project kickoff to begin <strong>In Progress</strong> development.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto border border-emerald-300">
            Awaiting Kickoff
          </span>
        </div>
      )}

      {/* STEP 4: IN PROGRESS BANNER */}
      {(project.status === "IN_PROGRESS" || project.status === "WORKING") && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Stage 4: In Progress
              </div>
              <p className="text-xs text-indigo-800 font-medium mt-0.5">
                Development is actively underway by the assigned technical squad. Milestones and sprint deliverables are being tracked.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 self-start sm:self-auto border border-indigo-300">
            Active Development
          </span>
        </div>
      )}

      {/* STEP 5: COMPLETED BANNER */}
      {project.status === "COMPLETED" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Stage 5: Development Completed
              </div>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                All features and requirements have been built and tested. Next step: Final invoice clearance & delivery.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: PAYMENT BANNER */}
      {project.status === "PAYMENT_PENDING" && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Stage 6: Payment Pending
              </div>
              <div className="text-sm font-bold text-rose-900 mt-0.5">
                Payment Due = ₹{(financials?.pendingPayment || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: DELIVERED BANNER */}
      {(project.status === "DELIVERED" || project.status === "READY_FOR_DELIVERY") && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Stage 7: Project Delivered
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                This project has been officially handed over and completed. All deliverables and final receipts are available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CHANGES REQUESTED BANNER */}
      {project.status === "CHANGES_REQUESTED" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Budget Adjustments Requested
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                You requested adjustments to the proposal. Admin will review your feedback and send an updated budget.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Project Overview & Objectives</h3>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                {project.description}
              </p>
            </div>

            {project.assignedTeam?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Assigned Technical Squad</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.assignedTeam.map((member: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Client & Institution
                </h3>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Client Contact</span>
                  <div className="font-bold text-slate-900 text-xs mt-0.5">{project.clientName}</div>
                  <div className="text-slate-500 text-xs">{project.clientEmail}</div>
                  {project.clientPhone && <div className="text-slate-500 text-xs">{project.clientPhone}</div>}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Institution</span>
                  <div className="font-bold text-slate-900 text-xs mt-0.5">{project.collegeName}</div>
                  {project.department && <div className="text-slate-500 text-xs">Department: {project.department}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Requirements */}
      {activeTab === "requirements" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Functional Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.functionalRequirements || "None provided"}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Technical Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.technicalRequirements || "None provided"}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Expected Features</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.expectedFeatures || "None provided"}
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
              <div className="flex flex-col gap-1.5 text-xs">
                {String(project.requirements.referenceLinks)
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map((link: string, i: number) =>
                    /^https?:\/\//i.test(link) ? (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
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

      {/* Tab 3: Payments */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Agreed Project Total:</div>
              <div className="text-lg font-bold text-slate-900">
                ₹{(financials?.totalBudget || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Total Payments Cleared:</div>
              <div className="text-lg font-bold text-emerald-600">
                ₹{(financials?.totalPaid || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Pending Amount:</div>
              <div className="text-lg font-bold text-amber-600">
                ₹{(financials?.pendingPayment || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
            Payment Receipts & History
          </h4>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No payments recorded yet.</p>
          ) : (
            <>
              {/* Mobile View: Clean Card List - Zero Slider */}
              <div className="block sm:hidden space-y-2.5">
                {payments.map((p: any) => (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        ₹{p.amount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold">
                        {p.paymentMethod}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
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
              <div className="hidden sm:block">
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

      {/* Tab 6: Activity */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">
            Audit History & Milestones
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

      {/* Modal 1: Approve Confirmation Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Approve Project Budget as Student Ambassador?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              As the Student Ambassador for this project, you are approving the proposed budget of{" "}
              <strong className="text-slate-900 font-bold text-sm">
                ₹{(project.approvedBudget || activeQuotation?.total || project.expectedBudget || 0).toLocaleString()}
              </strong>
              . Once approved, the project status will advance to{" "}
              <span className="font-semibold text-emerald-700">APPROVED</span> and the technical squad will begin development kickoff.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] text-slate-600 space-y-1 mb-5">
              <div className="flex justify-between">
                <span>Project:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{project.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span>Project ID:</span>
                <span className="font-mono font-semibold text-slate-800">{project.projectId}</span>
              </div>
              <div className="flex justify-between">
                <span>Agreed Total:</span>
                <span className="font-bold text-emerald-600">
                  ₹{(project.approvedBudget || activeQuotation?.total || project.expectedBudget || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveBudget}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {actionLoading ? (
                  <span>Approving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Approve Budget</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Decline / Adjustment Request Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Decline or Request Adjustment
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Let the admin know why you are declining the proposed budget of ₹{(project.approvedBudget || activeQuotation?.total || project.expectedBudget || 0).toLocaleString()} or what modifications you need.
            </p>

            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Budget is too high for the student's capstone budget. We can offer ₹... or would like to remove optional modules."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-900 mb-5 focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineBudget}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {actionLoading ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Submit Feedback to Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
