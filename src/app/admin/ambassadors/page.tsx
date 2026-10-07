"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Award, Users, Download, ArrowRight, IndianRupee } from "lucide-react";

export default function AdminAmbassadorsPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topAmbassadors = data?.topAmbassadors || [];

  return (
    <AdminLayout
      title="Campus Ambassador Performance"
      subtitle="Track college outreach, conversion metrics, student referral pipelines, and revenue attribution"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="text-xs text-slate-500 font-medium">
          {topAmbassadors.length} Registered Campus Ambassadors
        </div>
        <a
          href="/api/admin/export?type=students"
          download
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ambassadors CSV</span>
        </a>
      </div>

      {/* Ambassador Performance Table (Requirement 26) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading ambassador performance...</div>
        ) : topAmbassadors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No ambassador data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Ambassador ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4 text-center">Submitted</th>
                  <th className="py-3.5 px-4 text-center">Approved</th>
                  <th className="py-3.5 px-4 text-center">Working</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Rejected</th>
                  <th className="py-3.5 px-4 text-center">Conversion</th>
                  <th className="py-3.5 px-4 text-right">Project Value</th>
                  <th className="py-3.5 px-4 text-right">Revenue</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {topAmbassadors.map((amb: any) => (
                  <tr key={amb.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {amb.ambassadorId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{amb.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{amb.collegeName}</td>
                    <td className="py-3.5 px-4 text-center font-medium">{amb.submitted}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{amb.approved}</td>
                    <td className="py-3.5 px-4 text-center text-indigo-600 font-bold">{amb.working}</td>
                    <td className="py-3.5 px-4 text-center text-teal-600 font-bold">{amb.completed}</td>
                    <td className="py-3.5 px-4 text-center text-rose-600 font-medium">{amb.rejected}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {amb.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      ₹{amb.totalValue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      ₹{amb.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/students/${amb.userId}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Profile &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
