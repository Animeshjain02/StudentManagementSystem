"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscribeToRealtime } from "@/lib/realtime";
import {
  GraduationCap,
  Clock,
  Check,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Building,
  Layers,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Search,
} from "lucide-react";

interface PublicProjectStatus {
  trackingHash?: string;
  projectId: string;
  projectName: string;
  projectType: string;
  department: string;
  collegeName?: string;
  status: string;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "QUOTATION_SENT", label: "Quotation" },
  { key: "APPROVED", label: "Approval" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PAYMENT_PENDING", label: "Payment" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

function getStageIndex(status: string): number {
  switch (status) {
    case "SUBMITTED":
      return 0;
    case "QUOTATION_SENT":
    case "QUOTATION_PREPARATION":
    case "UNDER_REVIEW":
    case "REQUIREMENT_CLARIFICATION":
      return 1;
    case "APPROVED":
    case "AWAITING_APPROVAL":
    case "ASSIGNED":
      return 2;
    case "IN_PROGRESS":
    case "WORKING":
    case "TESTING":
    case "CLIENT_REVIEW":
    case "CHANGES_REQUESTED":
      return 3;
    case "COMPLETED":
    case "READY_FOR_DELIVERY":
      return 4;
    case "PAYMENT_PENDING":
      return 5;
    case "DELIVERED":
      return 6;
    default:
      return 0;
  }
}

function getStatusBadge(status: string, activeIdx: number) {
  if (activeIdx === 6) {
    return {
      label: "Delivered & Complete",
      style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      desc: "All deliverables have been handed over successfully.",
    };
  }
  if (activeIdx === 5) {
    return {
      label: "Payment Pending",
      style: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      desc: "Project milestones are finished and undergoing final disbursement.",
    };
  }
  if (activeIdx === 4) {
    return {
      label: "Completed",
      style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      desc: "Development and verification milestones are fully achieved.",
    };
  }
  if (activeIdx === 3) {
    return {
      label: "In Active Development",
      style: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      desc: "Engineering team is currently developing the project.",
    };
  }
  if (activeIdx === 2) {
    return {
      label: "Approved & Assigned",
      style: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      desc: "Project plan is approved and assigned to the development team.",
    };
  }
  if (activeIdx === 1) {
    return {
      label: "Quotation & Scoping",
      style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      desc: "Technical requirements and scope are being reviewed.",
    };
  }
  return {
    label: "Submitted",
    style: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    desc: "Project proposal received and queued in campus pipeline.",
  };
}

export function TrackProjectPageClient({ initialProjectId }: { initialProjectId: string }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [project, setProject] = useState<PublicProjectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [searchInput, setSearchInput] = useState("");

  const fetchProjectStatus = useCallback(async (idToFetch: string) => {
    if (!idToFetch) return;
    try {
      const res = await fetch(`/api/projects/public-status?query=${encodeURIComponent(idToFetch)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Project not found");
      }
      setProject(data.project);
      setError("");
      setLastSynced(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load project details.");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useEffect(() => {
    fetchProjectStatus(projectId);

    // 1. Subscribe to BroadcastChannel and window custom events
    const unsubscribe = subscribeToRealtime((event) => {
      if (
        !event.projectId ||
        event.projectId.toLowerCase() === projectId.toLowerCase() ||
        event.type === "STATUS_CHANGED" ||
        event.type === "PROJECT_UPDATED"
      ) {
        fetchProjectStatus(projectId);
      }
    });

    // 2. Poll every 2.5s for seamless live status updates
    const pollInterval = setInterval(() => {
      fetchProjectStatus(projectId);
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [projectId, fetchProjectStatus]);

  const handleSearchNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    router.push(`/track/${encodeURIComponent(clean)}`);
    setProjectId(clean);
    setLoading(true);
  };

  const activeStageIdx = project ? getStageIndex(project.status) : 0;
  const statusBadge = project ? getStatusBadge(project.status, activeStageIdx) : null;

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex flex-col relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0d_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0d_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50rem] h-[25rem] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[35rem] h-[25rem] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/student/login" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white block truncate">
                Campus Ambassador
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase text-indigo-400 block truncate">
                Project Tracking
              </span>
            </div>
          </Link>

          <Link
            href="/student/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {loading ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-12 text-center backdrop-blur-xl">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white">Fetching Live Project Status...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to campus database for {projectId}</p>
          </div>
        ) : error || !project ? (
          /* Not Found / Error State */
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-xl shadow-2xl max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Project Not Found</h1>
            <p className="mt-2 text-sm text-slate-400">
              {error || `No project found matching "${projectId}".`}
            </p>

            <form onSubmit={handleSearchNewProject} className="mt-6 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter valid Project ID..."
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <Link
                href="/student/login"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Student Sign-In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Project Found: Live Timeline View */
          <div className="space-y-6">
            {/* Top Project Card */}
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-3xl p-5 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-semibold">
                      Tracking #{project.trackingHash || project.projectId}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Status
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight break-words">
                    {project.projectName}
                  </h1>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 flex-shrink-0 pt-1 sm:pt-0">
                  <span className="text-[11px] text-slate-400 sm:text-right">Current Stage</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge?.style}`}
                  >
                    {statusBadge?.label}
                  </span>
                </div>
              </div>

              {/* Status Description Banner */}
              <div className="mt-5 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="font-semibold text-white">Latest Milestone Update: </span>
                {statusBadge?.desc}
              </div>

              {/* 7-STEP TIMELINE STEPPER */}
              
              {/* MOBILE VIEW (Vertical Flow - No Overlap) */}
              <div className="sm:hidden mt-8 pt-2 space-y-4">
                {STAGES.map((stg, i) => {
                  const isCompleted = i < activeStageIdx;
                  const isCurrent = i === activeStageIdx;
                  const isLast = i === STAGES.length - 1;

                  return (
                    <div key={stg.key} className="flex items-start gap-3.5 relative">
                      {/* Vertical connector line */}
                      {!isLast && (
                        <div
                          className={`absolute left-4 top-8 bottom-[-16px] w-0.5 -translate-x-1/2 ${
                            isCompleted
                              ? "bg-indigo-600"
                              : isCurrent
                              ? "bg-gradient-to-b from-indigo-600 to-slate-800"
                              : "bg-slate-800"
                          }`}
                        />
                      )}

                      {/* Node Icon */}
                      <div className="relative z-10 flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : isCurrent ? (
                          <div className="relative flex items-center justify-center">
                            <div className="absolute -inset-1 rounded-full bg-indigo-500/25 animate-ping opacity-75" />
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 ring-4 ring-indigo-500/20 relative z-10">
                              <div className="w-2.5 h-2.5 rounded-full bg-white ring-1 ring-indigo-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          </div>
                        )}
                      </div>

                      {/* Stage Label & Status */}
                      <div className="pt-1 flex-1 flex items-center justify-between">
                        <span
                          className={`text-xs ${
                            isCurrent
                              ? "text-indigo-400 font-bold"
                              : isCompleted
                              ? "text-slate-200 font-semibold"
                              : "text-slate-500 font-medium"
                          }`}
                        >
                          {stg.label}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                            Current Stage
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-400/90 font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP / TABLET VIEW (Horizontal Flow) */}
              <div className="hidden sm:block mt-10 pt-4 pb-2 overflow-x-auto">
                <div className="relative min-w-[540px]">
                  {/* Connecting lines container */}
                  <div className="absolute top-5 left-0 right-0 -translate-y-1/2 flex items-center px-6 sm:px-10 pointer-events-none z-0">
                    {STAGES.map((_, i) => {
                      if (i === STAGES.length - 1) return null;
                      const isCompletedSegment = i < activeStageIdx;
                      const isCurrentSegment = i === activeStageIdx;

                      return (
                        <div key={i} className="flex-1 h-0.5 relative mx-1">
                          {isCompletedSegment ? (
                            <div className="h-full bg-indigo-600 w-full" />
                          ) : isCurrentSegment ? (
                            <div className="h-full w-full bg-slate-800 relative overflow-hidden">
                              <div className="absolute inset-y-0 left-0 w-1/2 bg-indigo-600" />
                            </div>
                          ) : (
                            <div className="h-full bg-slate-800 w-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nodes & Labels */}
                  <div className="grid grid-cols-7 relative z-10 text-center">
                    {STAGES.map((stg, i) => {
                      const isCompleted = i < activeStageIdx;
                      const isCurrent = i === activeStageIdx;

                      return (
                        <div key={stg.key} className="flex flex-col items-center group">
                          {isCompleted ? (
                            <div className="w-10 h-10 rounded-full bg-[#10b981] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 transition-all">
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            </div>
                          ) : isCurrent ? (
                            <div className="relative flex items-center justify-center">
                              <div className="absolute -inset-1.5 rounded-full bg-indigo-500/25 animate-ping opacity-75" />
                              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 ring-4 sm:ring-8 ring-indigo-500/15 relative z-10">
                                <div className="w-3 h-3 rounded-full bg-white ring-2 ring-indigo-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center transition-all">
                              <div className="w-2 h-2 rounded-full bg-slate-600" />
                            </div>
                          )}

                          <span
                            className={`mt-3 text-[11px] sm:text-xs tracking-tight transition-colors ${
                              isCurrent
                                ? "text-indigo-400 font-bold"
                                : isCompleted
                                ? "text-slate-200 font-medium"
                                : "text-slate-500 font-normal"
                            }`}
                          >
                            {stg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Details Grid (STRICT PRIVACY: NO AMOUNTS OR FINANCIALS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2.5 text-slate-400 text-xs mb-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Project Category</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {project.projectType || "General Software"}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2.5 text-slate-400 text-xs mb-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  <span>College / Department</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {project.department || "Engineering & Technology"}
                </div>
              </div>

              {project.expectedDeliveryDate && (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2.5 text-slate-400 text-xs mb-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Target Delivery Date</span>
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {new Date(project.expectedDeliveryDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2.5 text-slate-400 text-xs mb-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Last Updated</span>
                </div>
                <div className="text-sm font-semibold text-white flex items-center justify-between">
                  <span>
                    {new Date(project.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Back Action */}
            <div className="pt-2">
              <Link
                href="/student/login"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
