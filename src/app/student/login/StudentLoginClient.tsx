"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearStudentAuthCache } from "@/components/layouts/StudentLayout";
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";

export function StudentLoginClient() {
  const router = useRouter();

  useEffect(() => {
    clearStudentAuthCache();
  }, []);

  // Mode switcher: "ambassador" or "student"
  const [activeTab, setActiveTab] = useState<"ambassador" | "student">("ambassador");

  // Ambassador login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Student Project ID redirect state
  const [projectIdInput, setProjectIdInput] = useState("");

  // Ambassador Sign In submission
  const handleAmbassadorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          portal: "STUDENT",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      router.push("/student/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Student Project Tracking redirection
  const handleTrackProject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = projectIdInput.trim();
    if (!cleanId) return;
    router.push(`/track/${encodeURIComponent(cleanId)}`);
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0d_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0d_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[40rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[35rem] h-[30rem] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-slate-900/60 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Student Portal Visual Illustration */}
        <div className="lg:col-span-5 relative overflow-hidden bg-[#8b5cf6] flex items-center justify-center h-52 sm:h-72 lg:h-full lg:min-h-[580px] border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <img
            src="/images/student_portal_illustration.jpg"
            alt="Welcome to Student Portal"
            className="w-full h-full object-top"
          />
        </div>

        {/* Right Side: Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/40">
          <div className="max-w-md w-full mx-auto">
            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-950/90 border border-slate-800 rounded-2xl mb-7 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ambassador");
                  setError("");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "ambassador"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Campus Ambassador</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("student");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "student"
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Students</span>
              </button>
            </div>

            {/* TAB 1: Campus Ambassador Login */}
            {activeTab === "ambassador" && (
              <div>
                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <form className="space-y-4 sm:space-y-5" onSubmit={handleAmbassadorLogin}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                      Student Email Address
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@example.com"
                        className="block w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                      Password
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400">Remember credentials</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Ambassador Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Students (Enter Project ID -> Redirects to /track/[id]) */}
            {activeTab === "student" && (
              <div>
                <form className="space-y-5" onSubmit={handleTrackProject}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 tracking-wide">
                      Project ID
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={projectIdInput}
                        onChange={(e) => setProjectIdInput(e.target.value)}
                        placeholder="e.g. PRJ-2026-00001"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                      Your Project ID is provided by your Campus Ambassador during project initiation.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!projectIdInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>Track Project Live &rarr;</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
