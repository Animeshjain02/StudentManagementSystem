"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { BarChart3, Download, FileSpreadsheet, Layers, CreditCard, Users, TrendingUp } from "lucide-react";

export default function AdminReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = data?.cards || {};

  return (
    <AdminLayout
      title="Analytical Reports & Data Exports"
      subtitle="Comprehensive performance audits, college distributions, and financial exports"
    >
      {/* Export Action Center (Requirement 47) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
        <h3 className="text-base font-bold mb-2">Export Data Collections</h3>
        <p className="text-xs text-slate-400 mb-6 max-w-xl">
          Download formatted CSV spreadsheets compatible with Microsoft Excel, Google Sheets, and accounting software.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/api/admin/export?type=projects"
            download
            className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex items-center justify-between transition-colors group"
          >
            <div>
              <div className="font-bold text-xs text-white group-hover:text-indigo-300">
                Projects Portfolio CSV
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">All 20+ campus projects & budgets</div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </a>

          <a
            href="/api/admin/export?type=payments"
            download
            className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex items-center justify-between transition-colors group"
          >
            <div>
              <div className="font-bold text-xs text-white group-hover:text-emerald-300">
                Payment Transactions CSV
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">All remittances & transaction UTRs</div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </a>

          <a
            href="/api/admin/export?type=students"
            download
            className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex items-center justify-between transition-colors group"
          >
            <div>
              <div className="font-bold text-xs text-white group-hover:text-purple-300">
                Campus Ambassadors CSV
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Directory & college affiliations</div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </a>
        </div>
      </div>

      {/* Reports Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Delivered Projects</span>
          <div className="text-2xl font-bold text-teal-600 mt-1">{cards.deliveredProjects || 0}</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Completed Projects</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{cards.completedProjects || 0}</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Pipeline Value</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹{(cards.totalProjectValue || 0).toLocaleString()}
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Payments Realized</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            ₹{(cards.totalPaymentReceived || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
