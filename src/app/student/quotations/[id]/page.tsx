"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { downloadQuotationPDF } from "@/lib/company";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";

export default function StudentQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [quotationData, setQuotationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [changesText, setChangesText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadQuotation = async () => {
    try {
      const res = await fetch(`/api/quotations/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load quotation");
      }
      setQuotationData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAcceptModal(false);
      setActionSuccess("Quotation accepted! Your project is now officially APPROVED.");
      loadQuotation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowRejectModal(false);
      setActionSuccess("Quotation rejected. Company admin has been notified.");
      loadQuotation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesText.trim()) {
      alert("Please describe the modifications needed.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: changesText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowChangesModal(false);
      setActionSuccess("Modifications requested. Our team will prepare a revised version.");
      loadQuotation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quotationData) return;
    try {
      await downloadQuotationPDF(quotationData.quotation, quotationData.project);
    } catch (e: any) {
      alert(`Could not generate the PDF: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <StudentLayout title="Loading Quotation">
        <div className="p-12 text-center text-xs text-slate-500">Retrieving quotation...</div>
      </StudentLayout>
    );
  }

  if (error || !quotationData) {
    return (
      <StudentLayout title="Quotation Not Found">
        <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
          <p className="text-sm font-semibold">{error || "Quotation could not be found."}</p>
          <Link href="/student/quotations" className="text-xs underline mt-3 inline-block">
            Back to Quotations
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const { quotation, project, versionHistory, latestVersionId } = quotationData;
  const isSuperseded = quotation.status === "CANCELLED" && latestVersionId && latestVersionId !== quotation._id;
  const isActionable = ["SENT", "VIEWED"].includes(quotation.status);

  return (
    <StudentLayout
      title={`Quotation ${quotation.quotationId}`}
      subtitle={`Official Commercial Proposal for ${project.projectName}`}
    >
      <div className="mb-4">
        <Link
          href="/student/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotations</span>
        </Link>
      </div>

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Quotation Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-4xl mx-auto mb-8">
        {/* Sheet Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {quotation.quotationId}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-semibold">
                Version {quotation.version}
              </span>
              <StatusBadge status={quotation.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">Commercial Project Proposal</h1>
            <p className="text-xs text-slate-500">
              Issued for {project.collegeName}
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
        </div>

        {versionHistory?.length > 1 && (
          <div className="py-4 border-b border-slate-100 text-xs flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Versions</span>
            {versionHistory.map((v: any) => (
              <Link
                key={v._id}
                href={`/student/quotations/${v._id}`}
                className={`px-2.5 py-1 rounded-lg border ${
                  v._id === quotation._id
                    ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                v{v.version} &bull; ₹{v.total?.toLocaleString()}
              </Link>
            ))}
          </div>
        )}

        {/* Project & Client summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-100 text-xs">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Client & Campus
            </span>
            <div className="font-bold text-slate-900 text-sm">{project.clientName}</div>
            <div className="text-slate-600">{project.clientEmail}</div>
            <div className="text-slate-600">{project.collegeName}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Project Specification
            </span>
            <div className="font-bold text-slate-900 text-sm">{project.projectName}</div>
            <div className="text-slate-600">ID: {project.projectId} &bull; Type: {project.projectType}</div>
            <div className="text-slate-600">Valid Until: {new Date(quotation.validUntil).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Scope & Deliverables Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price (INR)</th>
                  <th className="py-2.5 px-3 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {quotation.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-3 font-medium">{item.description}</td>
                    <td className="py-3 px-3 text-center">{item.quantity}</td>
                    <td className="py-3 px-3 text-right">₹{item.unitPrice?.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-semibold">₹{item.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing calculations */}
          <div className="flex justify-end mt-4 text-xs">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">₹{quotation.subtotal?.toLocaleString()}</span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Educational Discount:</span>
                  <span>- ₹{quotation.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax / GST ({quotation.taxPercentage}%):</span>
                <span>₹{quotation.tax?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-indigo-700 pt-2 border-t border-slate-200">
                <span>Final Total Amount:</span>
                <span>₹{quotation.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Terms & Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-100 text-xs">
          <div>
            <span className="font-bold text-slate-800 block mb-1">Delivery Timeline</span>
            <p className="text-slate-600">{quotation.deliveryTimeline}</p>
          </div>
          <div>
            <span className="font-bold text-slate-800 block mb-1">Payment Schedule</span>
            <p className="text-slate-600">{quotation.paymentTerms}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="font-bold text-slate-800 block mb-1">Terms & Conditions</span>
            <p className="text-slate-500 whitespace-pre-wrap leading-relaxed">{quotation.terms}</p>
          </div>
        </div>

        {isSuperseded && (
          <div className="mt-6 p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between gap-3">
            <span>This version has been replaced by a newer revision and can no longer be accepted.</span>
            <Link href={`/student/quotations/${latestVersionId}`} className="font-semibold text-indigo-700 underline whitespace-nowrap">
              View latest version &rarr;
            </Link>
          </div>
        )}

        {quotation.status === "CHANGES_REQUESTED" && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            You requested changes to this quotation. Our team is preparing a revised version.
            {quotation.requestedChanges && <p className="mt-2 italic">&quot;{quotation.requestedChanges}&quot;</p>}
          </div>
        )}

        {quotation.status === "REJECTED" && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            You rejected this quotation{quotation.rejectionReason ? `: "${quotation.rejectionReason}"` : "."}
          </div>
        )}

        {quotation.status === "EXPIRED" && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            This quotation has expired. Please contact the admin for a refreshed quotation.
          </div>
        )}

        {/* Action Controls for Student (Accept, Reject, Request Changes) */}
        {isActionable && (
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
            >
              Reject Quotation
            </button>
            <button
              onClick={() => setShowChangesModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors"
            >
              Request Changes
            </button>
            <button
              onClick={() => setShowAcceptModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              Accept Quotation
            </button>
          </div>
        )}

        {quotation.status === "ACCEPTED" && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>
              This quotation has been officially <strong>ACCEPTED</strong> on{" "}
              {new Date(quotation.acceptedAt).toLocaleDateString()}. The project is marked as <strong>APPROVED</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Modal 1: Accept Confirmation */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">Accept Quotation & Approve Project?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              By confirming, you agree to the price of <strong>₹{quotation.total?.toLocaleString()}</strong> and payment
              terms. The project status will automatically advance to <strong>APPROVED</strong>, and our team will be
              scheduled to begin development.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                {actionLoading ? "Accepting..." : "Confirm & Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Reject Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reject Quotation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please let our engineering team know why this quotation is being declined.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Budget constraints, project canceled by college, decided on alternative..."
              className="w-full p-3 border border-slate-300 rounded-lg text-xs text-slate-900 mb-4 focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                {actionLoading ? "Submitting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Request Changes */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">Request Quotation Adjustments</h3>
            <p className="text-xs text-slate-500 mb-4">
              Describe the specific changes you require (features to add/remove, timeline adjustments, or budget targets):
            </p>

            <textarea
              rows={4}
              value={changesText}
              onChange={(e) => setChangesText(e.target.value)}
              placeholder="e.g. Please include cloud deployment setup on AWS and revise the pricing to fit our departmental budget of ₹45,000..."
              className="w-full p-3 border border-slate-300 rounded-lg text-xs text-slate-900 mb-4 focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowChangesModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
              >
                {actionLoading ? "Sending..." : "Submit Change Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
