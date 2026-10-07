"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Shield,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  CreditCard,
  Sparkles,
  Database,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedMessage("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage("Database successfully initialized with full demo dataset!");
      } else {
        setSeedMessage(`Seed error: ${data.error}`);
      }
    } catch (e: any) {
      setSeedMessage(`Failed to run seed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">NexusDev Solutions</span>
              <span className="text-xs text-indigo-400 block font-medium">Campus Ambassador Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthDisabled && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Direct Access Mode (Auth Disabled)
              </span>
            )}
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{seeding ? "Seeding Database..." : "Seed Demo DB"}</span>
            </button>
            <Link
              href={isAuthDisabled ? "/student/dashboard" : "/student/login"}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              {isAuthDisabled ? "Student Dashboard →" : "Portal Login"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24">
        {seedMessage && (
          <div className="mb-8 p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-sm flex items-center justify-between max-w-2xl mx-auto shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{seedMessage}</span>
            </div>
            <button
              onClick={() => setSeedMessage("")}
              className="text-indigo-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Production-Ready Campus Ambassador & Project Management System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Bridging College Innovation with{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              Enterprise Software Delivery
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A comprehensive, dual-portal platform for Campus Ambassadors to submit student capstone projects,
            receive formal quotations, track development sprints, and clear milestone payments.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Student / Ambassador Portal */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/80 p-8 shadow-xl hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Student / Ambassador Portal</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Submit capstone projects from your college, review official price quotations, accept or request changes,
              and track sprint milestones in real time.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Submit projects with detailed functional & technical specs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Review, Accept, Reject, or Request Changes to Quotations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Real-time milestone progress and payment ledger</span>
              </li>
            </ul>

            <Link
              href={isAuthDisabled ? "/student/dashboard" : "/student/login"}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all"
            >
              <span>{isAuthDisabled ? "Direct Access: Open Student Dashboard" : "Access Student Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="relative group rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/80 p-8 shadow-xl hover:border-purple-500/50 transition-all hover:shadow-2xl hover:shadow-purple-500/10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Enterprise Admin Portal</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Full centralized control to onboard Campus Ambassadors, review submitted specs, generate versioned PDF
              quotations, manage milestones, and record payments.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Manage Ambassadors with automated ID generation (CA-2026-XXXX)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Line-item quotation builder with automated PDF generation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recharts analytics, milestone tracking, and audit activity logs</span>
              </li>
            </ul>

            <Link
              href={isAuthDisabled ? "/admin/dashboard" : "/admin/login"}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md shadow-purple-600/20 transition-all"
            >
              <span>{isAuthDisabled ? "Direct Access: Open Admin Dashboard" : "Access Admin Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Development Test Accounts Card */}
        <div className="max-w-2xl mx-auto bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 backdrop-blur-sm">
          {isAuthDisabled ? (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span><strong>Login is currently disabled.</strong> Direct dashboard access is active.</span>
              </div>
              <span className="text-[11px] text-slate-400">Set DISABLE_AUTH=false in .env.local to re-enable</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4 text-amber-400 font-semibold text-xs tracking-wider uppercase">
              <Lock className="w-4 h-4" />
              <span>Development Test Credentials (Requirement 45)</span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
              <div className="font-bold text-indigo-300 mb-1">Admin Account:</div>
              <div className="text-slate-300">Email: <span className="font-mono text-white">admin@example.com</span></div>
              <div className="text-slate-300">Password: <span className="font-mono text-white">Admin@12345</span></div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
              <div className="font-bold text-indigo-300 mb-1">Student Account (First Login Demo):</div>
              <div className="text-slate-300">Email: <span className="font-mono text-white">student@example.com</span></div>
              <div className="text-slate-300">Password: <span className="font-mono text-white">Student@12345</span></div>
              <div className="text-[10px] text-amber-400/90 mt-1">Requires password change on 1st login</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/40 text-center">
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Click here to initialize/reseed demo database (20 projects, 10 ambassadors, quotations, payments)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
