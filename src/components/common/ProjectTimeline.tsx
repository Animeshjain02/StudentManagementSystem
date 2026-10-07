import React from "react";
import { CheckCircle2, Clock, CircleDot, AlertCircle } from "lucide-react";

interface ProjectTimelineProps {
  currentStatus: string;
  startDate?: string | Date;
  expectedDeliveryDate?: string | Date;
  actualDeliveryDate?: string | Date;
}

const STAGES = [
  { id: "SUBMITTED", label: "Submitted", desc: "Project specs received from campus" },
  { id: "UNDER_REVIEW", label: "Review", desc: "Technical feasibility check" },
  { id: "QUOTATION_SENT", label: "Quotation", desc: "Pricing and line items prepared" },
  { id: "APPROVED", label: "Approval", desc: "Student/Client formal acceptance" },
  { id: "WORKING", label: "Development", desc: "Core architecture & coding sprint" },
  { id: "TESTING", label: "Testing", desc: "QA verification & regression checks" },
  { id: "CLIENT_REVIEW", label: "Client Review", desc: "Demo and UAT evaluation" },
  { id: "DELIVERED", label: "Delivery", desc: "Artifacts & source code handover" },
  { id: "PAYMENT_PENDING", label: "Payment", desc: "Final invoice clearing" },
  { id: "COMPLETED", label: "Completed", desc: "Warranty & success signoff" },
];

export function ProjectTimeline({
  currentStatus,
  startDate,
  expectedDeliveryDate,
  actualDeliveryDate,
}: ProjectTimelineProps) {
  // Map currentStatus to a stage index
  const stageWeights: Record<string, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 1,
    REQUIREMENT_CLARIFICATION: 1,
    QUOTATION_PREPARATION: 2,
    QUOTATION_SENT: 2,
    AWAITING_APPROVAL: 2,
    APPROVED: 3,
    ASSIGNED: 4,
    WORKING: 4,
    TESTING: 5,
    CLIENT_REVIEW: 6,
    CHANGES_REQUESTED: 6,
    READY_FOR_DELIVERY: 7,
    DELIVERED: 7,
    PAYMENT_PENDING: 8,
    COMPLETED: 9,
    REJECTED: -1,
    CANCELLED: -1,
  };

  const currentIdx = stageWeights[currentStatus] ?? 0;
  const isTerminated = currentIdx === -1;

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Project Workflow Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage progression and delivery milestones
          </p>
        </div>
        {startDate && (
          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mt-2 sm:mt-0">
            <span className="font-medium text-slate-900">Kickoff:</span>{" "}
            {new Date(startDate).toLocaleDateString()} &bull;{" "}
            <span className="font-medium text-slate-900">Est. Target:</span>{" "}
            {expectedDeliveryDate ? new Date(expectedDeliveryDate).toLocaleDateString() : "TBD"}
          </div>
        )}
      </div>

      {isTerminated ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            This project has been marked as <strong>{currentStatus}</strong>. Active stage progression is paused.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {STAGES.map((stg, idx) => {
              const isPassed = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isPending = idx > currentIdx;

              return (
                <div
                  key={stg.id}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
                      : isPassed
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-slate-50/50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="mb-2">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <CircleDot className="w-5 h-5 text-indigo-600 animate-pulse" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold leading-tight ${
                      isCurrent
                        ? "text-indigo-900"
                        : isPassed
                        ? "text-emerald-900"
                        : "text-slate-600"
                    }`}
                  >
                    {stg.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                    {stg.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
