"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enterDirectly = () => {
    if (typeof document !== "undefined") {
      document.cookie = "active_portal=admin; path=/; max-age=86400";
    }
    router.push("/admin/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthDisabled) {
      enterDirectly();
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: "ADMIN" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail("admin@example.com");
    setPassword("Admin@12345");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Link href="/" className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <Shield className="w-7 h-7" />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Company Admin Portal
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Executive access for project evaluation, quotations & operations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-4 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {isAuthDisabled && (
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200">
              <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-purple-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Direct Access Mode (Auth Disabled)
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Login requirements are currently turned off. You can enter the Admin dashboard directly.
              </p>
              <button
                type="button"
                onClick={enterDirectly}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md transition-colors"
              >
                <span>Enter Admin Dashboard Directly</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Work Email
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Master Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-purple-400 hover:text-purple-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Admin Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-300 text-xs border border-slate-800 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>Use Admin Test Credentials (admin@example.com)</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/student/login" className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
            Are you a student ambassador? <span className="text-purple-400 font-semibold underline">Student Login &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
