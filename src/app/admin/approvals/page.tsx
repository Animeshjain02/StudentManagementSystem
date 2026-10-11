"use client";

import { budgetLabel } from "@/lib/format";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CheckCircle, Clock, ArrowRight, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function AdminApprovalsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApprovals() {
      try {
        const [projRes, quotRes] = await Promise.all([
          fetch("/api/projects?status=QUOTATION_SENT,AWAITING_APPROVAL&limit=100"),
          fetch("/api/quotations?status=CHANGES_REQUESTED"),
        ]);
        const projData = await projRes.json();
        const quotData = await quotRes.json();
        setProjects(projData.projects || []);
        setQuotations(quotData.quotations || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadApprovals();
  }, []);

  return (
    <AdminLayout
      title="Approvals & Change Requests Queue"
      subtitle="Priority actions requiring immediate executive review or quotation revision"
    >
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Section 1: Quotations with Changes Requested */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Quotation Change Requests ({quotations.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-700">Student requested price/scope modifications</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading change requests...</div>
          ) : quotations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No change requests currently pending.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {quotations.map((q) => (
                <div key={q._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-slate-900">{q.quotationId}</span>
                      <span className="text-slate-600 font-semibold">for {q.projectId?.projectName}</span>
                      <StatusBadge status={q.status} size="sm" />
                    </div>
                    <p className="text-slate-500 italic bg-amber-50/50 p-2 rounded border border-amber-200/60 max-w-xl">
                      &quot;{q.requestedChanges || "Please review quotation scope"}&quot;
                    </p>
                  </div>

                  <Link
                    href={`/admin/quotations/${q._id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto"
                  >
                    <span>Issue Revision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Projects Awaiting Approval */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Projects Awaiting Student Approval ({projects.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Sent quotations pending client decision</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No projects waiting in this state.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {projects.map((p) => (
                <div key={p._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-indigo-600">{p.projectId}</span>
                      <span className="font-bold text-slate-900">{p.projectName}</span>
                      <StatusBadge status={p.status} size="sm" />
                    </div>
                    <div className="text-slate-500">
                      College: {p.collegeName} &bull; Client: {p.clientName} &bull; Budget: {budgetLabel(p)}
                    </div>
                  </div>

                  <Link
                    href={`/admin/projects/${p._id}`}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <span>View Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
