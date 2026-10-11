"use client";

import { budgetLabel } from "@/lib/format";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  Send,
  Save,
  AlertCircle,
  Calculator,
} from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

function QuotationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    {
      description: "Architecture Design, Database Models & UX Wireframing",
      quantity: 1,
      unitPrice: 15000,
      amount: 15000,
    },
    {
      description: "Full-Stack Development Sprint (Core Features & REST APIs)",
      quantity: 1,
      unitPrice: 25000,
      amount: 25000,
    },
    {
      description: "Quality Assurance, Security Testing & Production Deployment",
      quantity: 1,
      unitPrice: 10000,
      amount: 10000,
    },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [taxPercentage, setTaxPercentage] = useState<number>(18);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [deliveryTimeline, setDeliveryTimeline] = useState("30 to 45 Business Days");
  const [paymentTerms, setPaymentTerms] = useState(
    "50% Advance on signing, 30% on milestone demo, 20% on final handover."
  );
  const [terms, setTerms] = useState(
    "1. Deliverables include 60 days of bug-fix warranty.\n2. Scope alterations subject to formal change order.\n3. Complete source code and deployment documentation transferred."
  );
  const [notes, setNotes] = useState(
    "Formulated specifically under Campus Ambassador program."
  );

  useEffect(() => {
    async function load() {
      try {
        const [projRes, settingsRes] = await Promise.all([
          fetch("/api/projects?limit=200"),
          fetch("/api/admin/settings"),
        ]);
        const projData = await projRes.json();
        let list: any[] = projData.projects || [];

        // A project linked from elsewhere must be selectable even if it is not in the first page of results
        if (preselectedProjectId && !list.some((p) => p._id === preselectedProjectId)) {
          const one = await fetch(`/api/projects/${preselectedProjectId}`);
          if (one.ok) list = [(await one.json()).project, ...list];
        }
        setProjects(list);
        if (!selectedProjectId && list.length > 0) setSelectedProjectId(list[0]._id);

        // Company defaults configured in Settings
        if (settingsRes.ok) {
          const { settings } = await settingsRes.json();
          if (typeof settings?.taxPercentage === "number") setTaxPercentage(settings.taxPercentage);
          if (settings?.defaultQuotationValidityDays) {
            setValidUntil(new Date(Date.now() + settings.defaultQuotationValidityDays * 86400000).toISOString().split("T")[0]);
          }
          if (settings?.defaultPaymentTerms) setPaymentTerms(settings.defaultPaymentTerms);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProjects(false);
      }
    }
    load();
  }, []);

  // Automatic Calculation (Requirement 14)
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice || 0), 0);
  const validDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxable = subtotal - validDiscount;
  const tax = Math.round((taxable * (Number.isFinite(Number(taxPercentage)) ? Number(taxPercentage) : 0)) / 100);
  const finalTotal = taxable + tax;

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...items];
    if (field === "quantity") {
      const q = Math.max(1, Number(val) || 1);
      updated[index].quantity = q;
      updated[index].amount = q * updated[index].unitPrice;
    } else if (field === "unitPrice") {
      const p = Math.max(0, Number(val) || 0);
      updated[index].unitPrice = p;
      updated[index].amount = updated[index].quantity * p;
    } else {
      (updated[index] as any)[field] = val;
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "New Deliverable Line Item",
        quantity: 1,
        unitPrice: 5000,
        amount: 5000,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (sendImmediately: boolean) => {
    if (!selectedProjectId) {
      setError("Please select a project.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const badItem = items.findIndex((it) => !it.description.trim());
    if (badItem !== -1) {
      setError(`Line item ${badItem + 1} needs a description.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!(Number(taxPercentage) >= 0 && Number(taxPercentage) <= 100)) {
      setError("Tax percentage must be between 0 and 100.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!validUntil || validUntil < new Date().toISOString().split("T")[0]) {
      setError("The 'Valid Until' date must be today or later.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!deliveryTimeline.trim() || !paymentTerms.trim()) {
      setError("Delivery timeline and payment terms are required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          items,
          discount: validDiscount,
          taxPercentage,
          validUntil,
          deliveryTimeline,
          paymentTerms,
          terms,
          notes,
          sendImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quotation");

      router.push(`/admin/quotations/${data.quotation._id}`);
    } catch (err: any) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link
          href="/admin/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotations</span>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Select Project */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-6 text-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
          Target Project
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {loadingProjects && <option value="">Loading projects...</option>}
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.projectId} - {p.projectName} ({p.collegeName})
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Project Benchmark
              </span>
              <div className="font-semibold text-slate-900">{selectedProject.projectName}</div>
              <div className="text-slate-500 mt-0.5">
                Client: {selectedProject.clientName} &bull; Budget: {budgetLabel(selectedProject)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Builder (Requirement 14) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-6 text-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Quotation Line Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Line Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-slate-50 border border-slate-200"
            >
              <div className="col-span-12 sm:col-span-6">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Item Description
                </label>
                <input
                  type="text"
                  required
                  value={it.description}
                  onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={it.quantity}
                  onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 text-center font-medium"
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Unit Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={it.unitPrice}
                  onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 text-right font-medium"
                />
              </div>

              <div className="col-span-3 sm:col-span-1 text-right">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Total
                </label>
                <div className="py-1.5 font-bold text-slate-900">
                  ₹{(it.quantity * it.unitPrice).toLocaleString()}
                </div>
              </div>

              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 mt-4"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Automated Calculations Box (Requirement 14) */}
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
          <div className="w-72 space-y-2.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900">₹{subtotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Discount (₹):</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-right font-medium"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Tax / GST (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-right font-medium"
              />
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Calculated Tax:</span>
              <span>₹{tax.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-indigo-700 pt-2 border-t border-slate-200">
              <span>Final Total Amount:</span>
              <span>₹{finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial Terms & Validity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs mb-6 text-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Commercial Terms & Schedule
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Valid Until *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split("T")[0]}
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Delivery Timeline *</label>
            <input
              type="text"
              required
              value={deliveryTimeline}
              onChange={(e) => setDeliveryTimeline(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Payment Schedule & Terms *</label>
            <input
              type="text"
              required
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Terms & Conditions</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/admin/quotations"
          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>Save as Draft</span>
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Send Quotation to Student</span>
        </button>
      </div>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <AdminLayout
      title="Create Formal Quotation"
      subtitle="Assemble transparent line items, compute tax/discounts, and dispatch to campus ambassador"
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading form...</div>}>
        <QuotationFormContent />
      </Suspense>
    </AdminLayout>
  );
}
