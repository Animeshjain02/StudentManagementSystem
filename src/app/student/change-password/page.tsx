"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function StudentChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Live password validation criteria checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const allValid =
    checks.length &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special &&
    checks.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      setError("Please satisfy all password security requirements.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/student/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">
          Create New Secure Password
        </h2>
        <p className="mt-2 text-center text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-1.5 rounded-lg max-w-sm mx-auto">
          Security Policy: You must change your temporary password to access your dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-4 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password successfully updated! Redirecting to dashboard...</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/60 space-y-1.5 text-[11px]">
              <div className="font-semibold text-slate-300 mb-1">Password Requirements:</div>
              <div className={`flex items-center gap-2 ${checks.length ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.length ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${checks.uppercase ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.uppercase ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-2 ${checks.lowercase ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.lowercase ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>At least one lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-2 ${checks.number ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.number ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 ${checks.special ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.special ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>At least one special character (!@#$%^&*...)</span>
              </div>
              <div className={`flex items-center gap-2 ${checks.match ? "text-emerald-400" : "text-slate-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checks.match ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !allValid}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <span>{loading ? "Updating..." : "Save Password & Enter Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
