"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectTimeline } from "@/components/common/ProjectTimeline";
import { PROJECT_STATUSES, ProjectStatus } from "@/models/Project";
import {
  ArrowLeft,
  FileSpreadsheet,
  PlusCircle,
  Save,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  CreditCard,
  History,
  User,
  AlertCircle,
  Plus,
} from "lucide-react";

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "requirements" | "quotation" | "timeline" | "milestones" | "payments" | "activity"
  >("overview");

  // Status and budget editable state
  const [statusVal, setStatusVal] = useState<ProjectStatus>("SUBMITTED");
  const [budgetVal, setBudgetVal] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // New Milestone Modal State
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    startDate: "",
    dueDate: "",
    assignedTo: "Engineering Squad Lead",
    status: "PENDING",
  });
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  // Add Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Bank Transfer",
    transactionReference: "",
    notes: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load project");
      setProjectData(data);
      setStatusVal(data.project.status);
      setBudgetVal(data.project.approvedBudget || data.project.expectedBudget || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handleUpdateStatusAndBudget = async () => {
    setSavingStatus(true);
    setSaveNotice("");
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusVal,
          approvedBudget: Number(budgetVal),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveNotice("Project status & budget updated successfully!");
      loadProject();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setMilestoneLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestoneForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowMilestoneModal(false);
      setMilestoneForm({
        name: "",
        description: "",
        startDate: "",
        dueDate: "",
        assignedTo: "Engineering Squad Lead",
        status: "PENDING",
      });
      loadProject();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleUpdateMilestone = async (mId: string, updates: any) => {
    try {
      const res = await fetch(`/api/milestones/${mId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) loadProject();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectData.project._id,
          ...paymentForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowPaymentModal(false);
      setPaymentForm({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "Bank Transfer",
        transactionReference: "",
        notes: "",
      });
      loadProject();
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Project Details">
        <div className="p-12 text-center text-xs text-slate-500">Loading project...</div>
      </AdminLayout>
    );
  }

  if (error || !projectData) {
    return (
      <AdminLayout title="Project Not Found">
        <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
          <p className="text-sm font-semibold">{error || "Project could not be found."}</p>
        </div>
      </AdminLayout>
    );
  }

  const { project, milestones, quotations, payments, activityLogs, financials } = projectData;

  return (
    <AdminLayout
      title={`Manage Project: ${project.projectId}`}
      subtitle={`${project.projectName} • Client: ${project.clientName}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {saveNotice && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button onClick={() => setSaveNotice("")} className="underline text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner with Workflow Status Controller (Requirement 10 & 13) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                {project.projectId}
              </span>
              <StatusBadge status={project.status} />
              <span className="text-xs text-slate-500">&bull; {project.projectType}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{project.projectName}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Ambassador: <strong>{project.studentId?.name || "Student"}</strong> &bull; College: {project.collegeName}
            </p>
          </div>

          {/* Admin Status & Budget Action Box (Requirement 6) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Project Status
              </label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value as ProjectStatus)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Approved Budget (₹)
              </label>
              <input
                type="number"
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleUpdateStatusAndBudget}
              disabled={savingStatus}
              className="mt-4 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs"
            >
              {savingStatus ? "Saving..." : "Update Status"}
            </button>
          </div>
        </div>

        {/* Visual Workflow Timeline Bar */}
        <div className="mt-6 pt-2">
          <ProjectTimeline
            currentStatus={project.status}
            startDate={project.startDate}
            expectedDeliveryDate={project.expectedDeliveryDate}
          />
        </div>
      </div>

      {/* Tabs (Requirement 13) */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto text-xs font-medium">
        {[
          { id: "overview", label: "Overview" },
          { id: "requirements", label: "Requirements" },
          { id: "quotation", label: `Quotations (${quotations.length})` },
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

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Project Description</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Assigned Engineering Squad</h3>
              <div className="flex flex-wrap gap-2">
                {project.assignedTeam?.length > 0 ? (
                  project.assignedTeam.map((m: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold"
                    >
                      {m}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">No squad members assigned yet.</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client & Referral Info
              </h3>
              <div>
                <span className="text-slate-500 block">Client Contact:</span>
                <span className="font-semibold text-slate-800">{project.clientName}</span>
                <span className="text-slate-500 block">{project.clientEmail}</span>
                <span className="text-slate-500 block">{project.clientPhone}</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Ambassador:</span>
                <span className="font-semibold text-slate-800">{project.studentId?.name}</span>
                <span className="text-slate-500 block">{project.studentId?.email}</span>
                <span className="text-slate-500 block">{project.collegeName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Requirements */}
      {activeTab === "requirements" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Functional Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.functionalRequirements || "None specified"}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Technical Requirements</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.technicalRequirements || "None specified"}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Expected Features</h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 whitespace-pre-wrap text-slate-700">
              {project.requirements?.expectedFeatures || "None specified"}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Quotations (Requirement 14) */}
      {activeTab === "quotation" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href={`/admin/quotations/new?projectId=${project._id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Quotation</span>
            </Link>
          </div>

          {quotations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No quotation created yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Formulate a formal proposal with line items to send to the student.
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
                      Valid Until: {new Date(q.validUntil).toLocaleDateString()} &bull; Total:{" "}
                      <strong className="text-slate-900">₹{q.total?.toLocaleString()}</strong>
                    </p>
                  </div>

                  <Link
                    href={`/admin/quotations/${q._id}`}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    Manage & Send Quotation &rarr;
                  </Link>
                </div>

                {/* Line items table preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2">Line Item Description</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {q.items?.map((it: any, i: number) => (
                        <tr key={i}>
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

      {/* Tab: Milestones (Requirement 23) */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project Milestone</span>
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No milestones established yet</p>
              <p className="text-xs text-slate-400 mt-1">Break this project down into deliverables and sprints.</p>
            </div>
          ) : (
            milestones.map((m: any) => (
              <div key={m._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                      <StatusBadge status={m.status} size="sm" />
                    </div>
                    <p className="text-slate-500 mt-0.5">{m.description}</p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Assigned: {m.assignedTo} &bull; Target Due Date:{" "}
                      <strong>{new Date(m.dueDate).toLocaleDateString()}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={m.status}
                      onChange={(e) => handleUpdateMilestone(m._id, { status: e.target.value })}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold bg-white text-slate-800"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="DELAYED">DELAYED</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.progress}
                      onChange={(e) =>
                        handleUpdateMilestone(m._id, { progress: Number(e.target.value) })
                      }
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                    <span className="font-bold text-slate-500">%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      m.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Payments (Requirement 24) */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Budget</span>
                <span className="font-bold text-base text-slate-900">
                  ₹{(financials?.totalBudget || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Total Paid</span>
                <span className="font-bold text-base text-emerald-600">
                  ₹{(financials?.totalPaid || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Pending Balance</span>
                <span className="font-bold text-base text-amber-600">
                  ₹{(financials?.pendingPayment || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record New Payment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Transaction Reference</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p: any) => (
                  <tr key={p._id}>
                    <td className="py-3 px-3 text-slate-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">₹{p.amount?.toLocaleString()}</td>
                    <td className="py-3 px-3">{p.paymentMethod}</td>
                    <td className="py-3 px-3 font-mono text-slate-800">{p.transactionReference}</td>
                    <td className="py-3 px-3 text-slate-600">{p.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Activity Logs */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">
            Immutable Audit Trail & Project Activity
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

      {/* Modal: Add Milestone (Requirement 23) */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Project Milestone</h3>
            <p className="text-xs text-slate-500 mb-4">Define sprint deliverable with target completion date.</p>

            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Milestone Name *</label>
                <input
                  type="text"
                  required
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  placeholder="e.g. Backend API Architecture & RBAC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={milestoneForm.startDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assigned Person / Role</label>
                <input
                  type="text"
                  value={milestoneForm.assignedTo}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={milestoneLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {milestoneLoading ? "Creating..." : "Save Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Payment (Requirement 24) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Record Payment Received</h3>
            <p className="text-xs text-slate-500 mb-4">
              Remaining pending balance:{" "}
              <strong className="text-amber-700">₹{(financials?.pendingPayment || 0).toLocaleString()}</strong>
            </p>

            {paymentError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={financials?.pendingPayment || undefined}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="25000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Transaction Reference / UTR *
                </label>
                <input
                  type="text"
                  required
                  value={paymentForm.transactionReference}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, transactionReference: e.target.value })
                  }
                  placeholder="e.g. UTR-HDFC-991823712"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Advance 50% payment verified"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {paymentLoading ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
