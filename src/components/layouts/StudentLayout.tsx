"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  PlusCircle,
  FileSpreadsheet,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface StudentLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function StudentLayout({ children, title, subtitle }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(
    isAuthDisabled
      ? {
          name: "Aarav Sharma",
          email: "student@example.com",
          role: "STUDENT",
          profile: { ambassadorId: "CA-2026-0001", collegeName: "IIT Delhi" },
        }
      : null
  );
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    // Set active portal cookie for direct access mode
    if (typeof document !== "undefined") {
      document.cookie = "active_portal=student; path=/; max-age=86400";
    }

    fetch("/api/auth/me?portal=student")
      .then((res) => {
        if (!res.ok) {
          if (!isAuthDisabled) {
            router.push("/student/login");
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          if (data.user.role !== "STUDENT" && !isAuthDisabled) {
            router.push("/admin/dashboard");
            return;
          }
          // REQUIREMENT 6: If mustChangePassword is true, force redirect to change password
          if (!isAuthDisabled && data.user.mustChangePassword && pathname !== "/student/change-password") {
            router.push("/student/change-password");
            return;
          }
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!isAuthDisabled) {
          router.push("/student/login");
        }
      });

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setUnreadNotifs(data.unreadCount || 0))
      .catch(() => {});
  }, [router, pathname, isAuthDisabled]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/student/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Projects", href: "/student/projects", icon: FolderGit2 },
    { label: "Quotations", href: "/student/quotations", icon: FileSpreadsheet },
    { label: "Payments", href: "/student/payments", icon: CreditCard },
    { label: "Notifications", href: "/student/notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight text-sm">Ambassador Hub</div>
            <div className="text-[10px] text-indigo-600 font-semibold tracking-wide">
              {user?.profile?.ambassadorId || "Student Portal"}
            </div>
          </div>
        </div>

        {/* Submit project CTA button */}
        <div className="p-3">
          <Link
            href="/student/projects/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm shadow-indigo-200 transition-all hover:shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New Project</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.label === "Notifications" && unreadNotifs > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifs}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Student User info & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              {user?.name?.slice(0, 2).toUpperCase() || "ST"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-800 truncate">{user?.name || "Campus Ambassador"}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.profile?.collegeName || user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title || "Student Dashboard"}</h1>
              {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/notifications"
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative block transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Ambassador
              </span>
            </div>
          </div>
        </header>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white text-slate-800">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">Ambassador Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
