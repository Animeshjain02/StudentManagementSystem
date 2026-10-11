"use client";

import { formatCurrency } from "@/lib/format";
import React, { useState, useEffect } from "react";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { CreditCard, IndianRupee, Clock, CheckCircle2, ShieldCheck, Calendar } from "lucide-react";

let cachedPayments: any[] = [];

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<any[]>(cachedPayments);
  const [loading, setLoading] = useState(cachedPayments.length === 0);

  useEffect(() => {
    fetch("/api/payments")
      .then((res) => res.json())
      .then((data) => {
        const list = data.payments || [];
        cachedPayments = list;
        setPayments(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <StudentLayout
      title="Payments & Financial Receipts"
      subtitle="View all verified transactions and payment milestone confirmations"
    >
      {/* Top Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Payments Confirmed</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1" suppressHydrationWarning>
              {formatCurrency(totalPaid)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Verified Receipts Logged</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{payments.length} Transactions</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment Transaction History
          </h3>
          <span className="text-[11px] text-slate-400">Read-Only Financial Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No payment records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Payments recorded by admin upon invoice settlement will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {payments.map((p) => (
                <div key={p._id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {p.transactionReference}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-xs" suppressHydrationWarning>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900 text-sm mb-0.5 leading-snug">
                    {p.projectId?.projectName || "Student Project"}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono mb-2.5">
                    {p.projectId?.projectId}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {p.paymentMethod}
                    </span>
                    <span className="text-[11px] inline-flex items-center gap-1" suppressHydrationWarning>
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </span>
                  </div>
                  {p.notes && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                      {p.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Transaction Ref</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                    <th className="py-3 px-4 whitespace-nowrap">Payment Method</th>
                    <th className="py-3 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {p.transactionReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {p.projectId?.projectName || "Student Project"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.projectId?.projectId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700" suppressHydrationWarning>
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500" suppressHydrationWarning>
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {p.notes || "-"}
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

