import React from "react";
import { CheckCircle2, CircleDot, AlertCircle, Clock } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ProjectTimelineProps {
  currentStatus: string;
  startDate?: string | Date;
  expectedDeliveryDate?: string | Date;
  actualDeliveryDate?: string | Date;
  isDirect?: boolean;
}

const STAGES = [
  { id: "SUBMITTED", label: "Submitted" },
  { id: "QUOTATION", label: "Quotation" },
  { id: "APPROVAL", label: "Approval" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PAYMENT", label: "Payment" },
  { id: "DELIVERED", label: "Delivered" },
];

const DIRECT_STAGES = [
  { id: "SUBMITTED", label: "Submitted" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PAYMENT", label: "Payment" },
  { id: "DELIVERED", label: "Delivered" },
];

export function ProjectTimeline({
  currentStatus,
  startDate,
  expectedDeliveryDate,
  actualDeliveryDate,
  isDirect,
}: ProjectTimelineProps) {
  const stageWeights: Record<string, number> = {
    // Stage 1: Submitted
    SUBMITTED: 0,

    // Stage 2: Quotation
    UNDER_REVIEW: 1,
    REQUIREMENT_CLARIFICATION: 1,
    QUOTATION_PREPARATION: 1,
    QUOTATION_SENT: 1,
    QUOTATION: 1,
    AWAITING_APPROVAL: 1,

    // Stage 3: Approval
    APPROVED: 2,
    APPROVAL: 2,

    // Stage 4: In Progress
    ASSIGNED: 3,
    WORKING: 3,
    IN_PROGRESS: 3,
    DEVELOPMENT: 3,
    TESTING: 3,
    CLIENT_REVIEW: 3,
    CHANGES_REQUESTED: 3,

    // Stage 5: Completed
    COMPLETED: 4,

    // Stage 6: Payment
    PAYMENT_PENDING: 5,
    PAYMENT: 5,
    PAID: 5,

    // Stage 7: Delivered
    READY_FOR_DELIVERY: 6,
    DELIVERED: 6,
    DELIVERY: 6,

    // Inactive / Terminated
    REJECTED: -1,
    CANCELLED: -1,
  };

  const directStageWeights: Record<string, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    REQUIREMENT_CLARIFICATION: 0,
    QUOTATION_PREPARATION: 0,
    QUOTATION_SENT: 0,
    QUOTATION: 0,
    AWAITING_APPROVAL: 0,
    APPROVED: 0,
    APPROVAL: 0,

    ASSIGNED: 1,
    WORKING: 1,
    IN_PROGRESS: 1,
    DEVELOPMENT: 1,
    TESTING: 1,
    CLIENT_REVIEW: 1,
    CHANGES_REQUESTED: 1,

    COMPLETED: 2,

    PAYMENT_PENDING: 3,
    PAYMENT: 3,
    PAID: 3,

    READY_FOR_DELIVERY: 4,
    DELIVERED: 4,
    DELIVERY: 4,

    REJECTED: -1,
    CANCELLED: -1,
  };

  const activeStages = isDirect ? DIRECT_STAGES : STAGES;
  const weights = isDirect ? directStageWeights : stageWeights;
  const currentIdx = weights[currentStatus] ?? 0;
  const isTerminated = currentIdx === -1;
  const progressPercent = isTerminated ? 0 : Math.round(((currentIdx + 1) / activeStages.length) * 100);

  const [showAllStagesMobile, setShowAllStagesMobile] = React.useState(false);

  if (isTerminated) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-800 text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
        <p>
          This project has been marked as <strong>{currentStatus}</strong>. Stage progression is inactive.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
        <div className="relative pt-1">
          {/* MOBILE VIEW (sm:hidden) - Zero Slider, Zero Horizontal Scroll */}
          <div className="block sm:hidden">
            {/* Mobile Active Stage Card with Expand Toggle */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {currentIdx + 1}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Stage</div>
                  <div className="text-xs font-bold text-slate-800">{activeStages[currentIdx]?.label}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllStagesMobile(!showAllStagesMobile)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors"
              >
                {showAllStagesMobile ? "Hide Stages" : `All ${activeStages.length} Stages`}
              </button>
            </div>

            {/* Expandable Mobile Vertical Roadmap */}
            {showAllStagesMobile && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in-50 duration-150">
                {activeStages.map((stg, idx) => {
                  const isPassed = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div
                      key={stg.id}
                      className={`flex items-center gap-3 p-2 rounded-lg text-xs transition-colors ${
                        isCurrent
                          ? "bg-indigo-50/80 border border-indigo-200 font-bold text-indigo-900"
                          : isPassed
                          ? "text-slate-700 font-medium"
                          : "text-slate-400 font-normal"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isPassed
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                      </div>
                      <span className="flex-1">{stg.label}</span>
                      <span className="text-[10px]">
                        {isPassed ? "Completed" : isCurrent ? "In Progress" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DESKTOP / TABLET VIEW (hidden sm:block) */}
          <div className="hidden sm:block">
            <div className="relative flex items-center justify-between w-full">
              {/* Line connector */}
              <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 -z-0">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{
                    width: `${(currentIdx / (activeStages.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {activeStages.map((stg, idx) => {
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={stg.id}
                    className="relative z-10 flex flex-col items-center flex-1 text-center"
                  >
                    {/* Step Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-4 ring-indigo-100"
                          : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-white border-2 border-slate-300 text-slate-400"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCurrent ? (
                        <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>

                    {/* Status Name */}
                    <span
                      className={`mt-2 text-[11px] font-medium transition-colors ${
                        isCurrent
                          ? "text-indigo-600 font-bold"
                          : isPassed
                          ? "text-slate-800 font-semibold"
                          : "text-slate-400"
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
  );
}

export default ProjectTimeline;
