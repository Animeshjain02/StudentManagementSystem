"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FileSpreadsheet, ArrowRight, Clock, AlertCircle } from "lucide-react";

export default function StudentQuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quotations")
      .then((res) => res.json())
      .then((data) => setQuotations(data.quotations || []))
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Quotation ID</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{q.total?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
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
        )}
      </div>
    </StudentLayout>
  );
}
