"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { FileSpreadsheet, ArrowRight, Calendar, Sparkles } from "lucide-react";

let cachedQuotations: any[] = [];

export default function StudentQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>(cachedQuotations);
  const [loading, setLoading] = useState(cachedQuotations.length === 0);

  useEffect(() => {
    fetch("/api/quotations")
      .then((res) => res.json())
      .then((data) => {
        const list = data.quotations || [];
        cachedQuotations = list;
        setQuotations(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentLayout
      title="Official Quotations"
      subtitle="Review pricing, deliverables, accept agreements, or request scope adjustments"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No quotations available</p>
            <p className="text-xs text-slate-400 mt-1">
              Once you submit a project, our architects will prepare formal line-item quotations.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {quotations.map((q) => (
                <div key={q._id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {q.quotationId}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        v{q.version}
                      </span>
                    </div>
                    <StatusBadge status={q.status} size="sm" />
                  </div>

                  <h4 className="font-semibold text-slate-900 text-sm mb-1 leading-snug">
                    {q.projectId?.projectName || "Student Project"}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono mb-3">
                    {q.projectId?.projectId}
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs mb-3 border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Amount</span>
                      <span className="font-bold text-slate-900 text-sm" suppressHydrationWarning>
                        {formatCurrency(q.total)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Valid Until</span>
                      <span className="text-slate-600 text-[11px] inline-flex items-center gap-1 font-medium" suppressHydrationWarning>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(q.validUntil).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Link
                      href={`/student/quotations/${q._id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                    >
                      <span>Review Quotation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Quotation ID</th>
                    <th className="py-3.5 px-4">Project</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Version</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Total Amount</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Valid Until</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quotations.map((q) => (
                    <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {q.quotationId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {q.projectId?.projectName || "Student Project"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {q.projectId?.projectId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          v{q.version}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900" suppressHydrationWarning>
                        {formatCurrency(q.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={q.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500" suppressHydrationWarning>
                        {new Date(q.validUntil).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/student/quotations/${q._id}`}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

