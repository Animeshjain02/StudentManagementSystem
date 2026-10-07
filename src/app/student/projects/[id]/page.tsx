"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectTimeline } from "@/components/common/ProjectTimeline";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  CreditCard,
  History,
  FileText,
  User,
  AlertTriangle,
  ExternalLink,
  Clock,
} from "lucide-react";

export default function StudentProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectData, setProjectData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "requirements" | "quotation" | "timeline" | "milestones" | "payments" | "activity"
  >("overview");

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load project");
        }
        setProjectData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id]);

  if (loading) {
    return (
      <StudentLayout title="Project Details">
        <div className="p-12 text-center text-xs text-slate-500">Loading project details...</div>
      </StudentLayout>
    );
  }

  if (error || !projectData) {
    return (
      <StudentLayout title="Project Not Found">
        <div className="max-w-xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="font-bold text-sm">Access Denied or Not Found</h3>
          <p className="text-xs mt-1 text-rose-700">{error || "Could not retrieve project data."}</p>
          <Link
            href="/student/projects"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
          >
            Back to My Projects
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const { project, milestones, quotations, payments, activityLogs, financials } = projectData;
  const activeQuotation = quotations?.[0]; // latest version

  return (
    <StudentLayout
      title={`${project.projectName}`}
      subtitle={`Project ID: ${project.projectId} • Submitted by Campus Ambassador`}
    >
      <div className="mb-4">
        <Link
          href="/student/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Projects</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {project.projectId}
              </span>
              <StatusBadge status={project.status} />
              <span className="text-xs text-slate-500">&bull; {project.projectType}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{project.projectName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <strong className="text-slate-700">{project.clientName}</strong> ({project.clientEmail}) &bull;{" "}
              {project.collegeName}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Budget</div>
              <div className="text-base font-bold text-slate-900">
                ₹{(project.approvedBudget || project.expectedBudget)?.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Paid</div>
              <div className="text-base font-bold text-emerald-600">
                ₹{(financials?.totalPaid || 0).toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Pending</div>
              <div className="text-base font-bold text-amber-600">
                ₹{(financials?.pendingPayment || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Workflow Timeline Bar (Requirement 22) */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <ProjectTimeline
            currentStatus={project.status}
            startDate={project.startDate}
            expectedDeliveryDate={project.expectedDeliveryDate}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto text-xs font-medium">
        {[
          { id: "overview", label: "Overview" },
          { id: "requirements", label: "Requirements" },
          { id: "quotation", label: `Quotation (${quotations.length})` },
          { id: "milestones", label: `Milestones (${milestones.length})` },
          { id: "payments", label: `Payments (${payments.length})` },
          { id: "activity", label: `Activity (${activityLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Project Description</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </div>

            {project.assignedTeam?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Assigned Engineering Squad</h3>
                <div className="flex flex-wrap gap-2">
                  {project.assignedTeam.map((member: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Contact & Campus
              </h3>
              <div>
                <span className="text-slate-500 block">Client Contact:</span>
                <span className="font-semibold text-slate-800">{project.clientName}</span>
                <span className="text-slate-500 block">{project.clientEmail}</span>
                {project.clientPhone && <span className="text-slate-500 block">{project.clientPhone}</span>}
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">College:</span>
                <span className="font-semibold text-slate-800">{project.collegeName}</span>
                <span className="text-slate-500 block">Department: {project.department}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Requirements */}
      {activeTab === "requirements" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Functional Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.functionalRequirements || "None provided"}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Technical Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.technicalRequirements || "None provided"}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Expected Features</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.expectedFeatures || "None provided"}
            </div>
          </div>

          {project.requirements?.referenceLinks && (
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-2">Reference Links</h4>
              <a
                href={project.requirements.referenceLinks}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>{project.requirements.referenceLinks}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Quotation */}
      {activeTab === "quotation" && (
        <div className="space-y-4">
          {quotations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No quotation generated yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Our architects are reviewing your submission. You will receive an email and notification once ready.
              </p>
            </div>
          ) : (
            quotations.map((q: any) => (
              <div key={q._id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">{q.quotationId}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Version {q.version}
                      </span>
                      <StatusBadge status={q.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Valid Until: {new Date(q.validUntil).toLocaleDateString()} &bull; Delivery: {q.deliveryTimeline}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Price</div>
                      <div className="text-xl font-bold text-indigo-600">₹{q.total?.toLocaleString()}</div>
                    </div>
                    <Link
                      href={`/student/quotations/${q._id}`}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      Open Quotation &rarr;
                    </Link>
                  </div>
                </div>

                {/* Line items preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {q.items?.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 font-medium">{it.description}</td>
                          <td className="py-2 text-center">{it.quantity}</td>
                          <td className="py-2 text-right">₹{it.unitPrice?.toLocaleString()}</td>
                          <td className="py-2 text-right font-semibold">₹{it.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Milestones */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No milestones configured yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Milestones will be established once the quotation is accepted and the project is assigned.
              </p>
            </div>
          ) : (
            milestones.map((m: any) => (
              <div key={m._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{m.name}</h4>
                      <StatusBadge status={m.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    Due: <strong className="text-slate-700">{new Date(m.dueDate).toLocaleDateString()}</strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-800">{m.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Payments */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Agreed Project Total:</div>
              <div className="text-lg font-bold text-slate-900">
                ₹{(financials?.totalBudget || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Total Payments Cleared:</div>
              <div className="text-lg font-bold text-emerald-600">
                ₹{(financials?.totalPaid || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Pending Amount:</div>
              <div className="text-lg font-bold text-amber-600">
                ₹{(financials?.pendingPayment || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
            Payment Receipts & History
          </h4>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Transaction Reference</th>
                    <th className="py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {payments.map((p: any) => (
                    <tr key={p._id}>
                      <td className="py-2.5 text-slate-500">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 font-bold text-emerald-700">₹{p.amount?.toLocaleString()}</td>
                      <td className="py-2.5">{p.paymentMethod}</td>
                      <td className="py-2.5 font-mono text-slate-600">{p.transactionReference}</td>
                      <td className="py-2.5 text-slate-500">{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Activity */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">
            Audit History & Milestones
          </h4>
          <div className="space-y-4 text-xs">
            {activityLogs.map((log: any) => (
              <div key={log._id} className="flex items-start gap-3 pb-3 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{log.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString()} &bull; Role: {log.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
