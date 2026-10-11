"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };
  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      setError("Please satisfy all password requirements.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset your password.");
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rule = (ok: boolean, label: string) => (
    <div className={`flex items-center gap-2 ${ok ? "text-emerald-400" : "text-slate-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-slate-500"}`} />
      <span>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">Choose a New Password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-4 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {!token ? (
            <div className="text-center space-y-4 text-xs text-slate-300">
              <p>This reset link is missing its security token.</p>
              <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Request a new reset link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">Password updated</h3>
              <p className="text-xs text-slate-300">You can now sign in with your new password.</p>
              <div className="flex justify-center gap-4 text-xs font-medium">
                <Link href="/student/login" className="text-indigo-400 hover:text-indigo-300">
                  Student login
                </Link>
                <Link href="/admin/login" className="text-indigo-400 hover:text-indigo-300">
                  Admin login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {error}{" "}
                    {/invalid or has expired/i.test(error) && (
                      <Link href="/forgot-password" className="underline">
                        Request a new link
                      </Link>
                    )}
                  </span>
                </div>
              )}

              {[
                { label: "New Password", value: newPassword, set: setNewPassword, placeholder: "Enter new password" },
                { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, placeholder: "Repeat new password" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">{f.label}</label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              ))}

              <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/60 space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-300 mb-1">Password Requirements:</div>
                {rule(checks.length, "At least 8 characters")}
                {rule(checks.uppercase, "At least one uppercase letter (A-Z)")}
                {rule(checks.lowercase, "At least one lowercase letter (a-z)")}
                {rule(checks.number, "At least one number (0-9)")}
                {rule(checks.special, "At least one special character (!@#$%^&*...)")}
                {rule(checks.match, "Passwords match")}
              </div>

              <button
                type="submit"
                disabled={loading || !allValid}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <span>{loading ? "Updating..." : "Reset Password"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
