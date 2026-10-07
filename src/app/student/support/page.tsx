"use client";

import React, { useState } from "react";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { HelpCircle, Mail, Phone, MessageSquare, Send, CheckCircle2 } from "lucide-react";

export default function StudentSupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const faqs = [
    {
      q: "How does the Campus Ambassador referral process work?",
      a: "When college students or campus departments need software development, submit their requirements through your 'Submit Project' tab. Our architects formulate a formal quotation with transparent line items.",
    },
    {
      q: "What happens after I accept a quotation?",
      a: "Accepting a quotation automatically marks the project as APPROVED. The engineering squad is scheduled, milestones are established, and you can track active progress live.",
    },
    {
      q: "Can I request changes to a quotation if the budget is different?",
      a: "Yes! Click 'Request Changes' on any quotation sheet to specify budget constraints or scope adjustments. Our team will prepare a revised version.",
    },
    {
      q: "How are payments recorded?",
      a: "Whenever advance or milestone payments are made via bank transfer or UPI, our finance team validates the reference and updates your payment ledger immediately.",
    },
  ];

  return (
    <StudentLayout
      title="Ambassador Support Desk"
      subtitle="Frequently asked questions and direct contact with program coordinators"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Support Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs text-center">
            <Mail className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <div className="font-bold text-xs text-slate-900">Email Support</div>
            <div className="text-xs text-slate-500 mt-1">ambassadors@nexusdev.solutions</div>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs text-center">
            <Phone className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <div className="font-bold text-xs text-slate-900">Dedicated Helpline</div>
            <div className="text-xs text-slate-500 mt-1">+91 80 4912 3456</div>
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs text-center">
            <MessageSquare className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <div className="font-bold text-xs text-slate-900">Operating Hours</div>
            <div className="text-xs text-slate-500 mt-1">Mon - Sat: 9:00 AM - 7:00 PM IST</div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="text-xs">
                <h4 className="font-bold text-slate-800 mb-1">{faq.q}</h4>
                <p className="text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Send an Escalation or Query</h3>
          <p className="text-xs text-slate-500 mb-4">
            Need urgent assistance with a college project or client meeting? Let us know:
          </p>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Your message has been sent to our partnership coordinator. We will reply within 4 hours.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Need technical architect for college faculty demo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your query in detail..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Submit Query</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
