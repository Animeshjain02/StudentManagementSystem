"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { generateQuotationPDF } from "@/lib/pdf";
import {
  ArrowLeft,
  Download,
  Send,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  History,
  Building,
  Calendar,
  Clock,
  Edit,
} from "lucide-react";

export default function AdminQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit / Revision modal state
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisedDiscount, setRevisedDiscount] = useState(0);

  const loadQuotation = async () => {
    try {
      const res = await fetch(`/api/quotations/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load quotation");
      setData(json);
      setRevisedDiscount(json.quotation.discount || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const handleSend = async () => {
    setActionLoading(true);
    setNotice("");
    try {
      const res = await fetch(`/api/quotations/${id}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNotice("Quotation dispatched to student and email delivered successfully!");
      loadQuotation();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const { quotation, project } = data;

    const doc = generateQuotationPDF({
      quotationId: quotation.quotationId,
      version: quotation.version,
      date: new Date(quotation.createdAt).toLocaleDateString(),
      validUntil: new Date(quotation.validUntil).toLocaleDateString(),
      companyName: "NexusDev Solutions Pvt Ltd",
      companyAddress: "Innov8 Hub, Koramangala 5th Block, Bengaluru, Karnataka 560095",
      companyEmail: "contact@nexusdev.solutions",
      companyPhone: "+91 80 4912 3456",
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      collegeName: project.collegeName,
      projectName: project.projectName,
      projectId: project.projectId,
      items: quotation.items,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      tax: quotation.tax,
      total: quotation.total,
      deliveryTimeline: quotation.deliveryTimeline,
      paymentTerms: quotation.paymentTerms,
      terms: quotation.terms,
    });

    doc.save(`${quotation.quotationId}_v${quotation.version}.pdf`);
  };

  const handleReviseAndResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount: revisedDiscount,
          changeReason: revisionReason,
          sendImmediately: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setShowReviseModal(false);
      setNotice(json.message);
      if (json.quotation?._id) {
        window.location.href = `/admin/quotations/${json.quotation._id}`;
      } else {
        loadQuotation();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Quotation Review">
        <div className="p-12 text-center text-xs text-slate-500">Loading quotation...</div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Not Found">
        <div className="p-8 text-center text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
          {error || "Quotation not found"}
        </div>
      </AdminLayout>
    );
  }

  const { quotation, project, versionHistory } = data;

  return (
    <AdminLayout
      title={`Quotation: ${quotation.quotationId} (v${quotation.version})`}
      subtitle={`Commercial agreement for ${project.projectName}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotations</span>
        </Link>
      </div>

      {notice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Quotation Display */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-slate-900">{quotation.quotationId}</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-200">
                Version {quotation.version}
              </span>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-xs text-slate-500">
              Created by: {quotation.createdBy?.name || "Admin"} &bull;{" "}
              {new Date(quotation.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {quotation.status !== "ACCEPTED" && (
              <button
                onClick={() => setShowReviseModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Revise & Version (v{quotation.version + 1})</span>
              </button>
            )}

            {quotation.status === "DRAFT" && (
              <button
                onClick={handleSend}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-200 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Sending..." : "Send to Student"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Change Request Alert (Requirement 19) */}
        {quotation.requestedChanges && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Student Feedback / Requested Adjustments:</span>
            </div>
            <p className="p-3 bg-white/80 rounded-lg border border-amber-200 mt-1 italic">
              &quot;{quotation.requestedChanges}&quot;
            </p>
          </div>
        )}

        {/* Version History (Requirement 20) */}
        {versionHistory?.length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Quotation Versioning History</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {versionHistory.map((v: any) => (
                <div
                  key={v.version}
                  className={`p-2.5 rounded-lg border text-xs ${
                    v.version === quotation.version
                      ? "bg-indigo-50 border-indigo-300 font-bold text-indigo-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <span>Version {v.version}</span> &bull; <span>₹{v.total.toLocaleString()}</span> &bull;{" "}
                  <span className="uppercase text-[10px]">{v.status}</span>
                  {v.changeReason && <div className="text-[10px] text-slate-400 mt-0.5">{v.changeReason}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formal Quotation Sheet Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-xs space-y-6">
          <div className="flex justify-between items-start pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">NEXUSDEV SOLUTIONS</h2>
              <p className="text-slate-500 mt-0.5">Campus Ambassador Capstone Delivery Division</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-slate-900">{quotation.quotationId}</div>
              <div className="text-slate-500">Date: {new Date(quotation.createdAt).toLocaleDateString()}</div>
              <div className="text-slate-500">Valid: {new Date(quotation.validUntil).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">To:</span>
              <div className="font-bold text-slate-900">{project.clientName}</div>
              <div className="text-slate-600">{project.clientEmail}</div>
              <div className="text-slate-600">{project.collegeName}</div>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">For Project:</span>
              <div className="font-bold text-slate-900">{project.projectName}</div>
              <div className="text-slate-600">Project ID: {project.projectId}</div>
              <div className="text-slate-600">Category: {project.projectType}</div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5">Scope Description</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {quotation.items?.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="py-3 font-medium">{it.description}</td>
                    <td className="py-3 text-center">{it.quantity}</td>
                    <td className="py-3 text-right">₹{it.unitPrice?.toLocaleString()}</td>
                    <td className="py-3 text-right font-bold">₹{it.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{quotation.subtotal?.toLocaleString()}</span>
                </div>
                {quotation.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>- ₹{quotation.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST (18%):</span>
                  <span>₹{quotation.tax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-indigo-700 pt-2 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span>₹{quotation.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Delivery Timeline:</span>
              <p className="text-slate-600">{quotation.deliveryTimeline}</p>
            </div>
            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Payment Terms:</span>
              <p className="text-slate-600">{quotation.paymentTerms}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Revise Quotation (Requirement 20) */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Create Revised Quotation Version {quotation.version + 1}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Quotation versioning will maintain Version {quotation.version} in historical logs while issuing
              Version {quotation.version + 1} to the student.
            </p>

            <form onSubmit={handleReviseAndResend} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Adjust Educational Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={revisedDiscount}
                  onChange={(e) => setRevisedDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Revision Reason (Stored in Version History) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Revised educational discount applied per student requested changes."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {actionLoading ? "Generating..." : `Issue Version ${quotation.version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
