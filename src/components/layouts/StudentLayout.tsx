"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  PlusCircle,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Sparkles,
  Loader2,
} from "lucide-react";

import { subscribeToRealtime } from "@/lib/realtime";

interface StudentLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

let cachedStudentUser: any = null;

export function clearStudentAuthCache() {
  cachedStudentUser = null;
}

export function StudentLayout({ children, title, subtitle }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(cachedStudentUser);
  const [checkingAuth, setCheckingAuth] = useState(!cachedStudentUser);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me?portal=student")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          if (data.user.role !== "STUDENT") {
            router.push("/admin/dashboard");
            return;
          }
          cachedStudentUser = data.user;
          setUser(data.user);
          setCheckingAuth(false);
        } else {
          cachedStudentUser = null;
          router.push("/student/login");
        }
      })
      .catch(() => {
        if (isMounted) {
          cachedStudentUser = null;
          router.push("/student/login");
        }
      });

    const pollNotifications = () => {
      fetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || !isMounted) return;
          const count = data.unreadCount || 0;
          setUnreadNotifs(count);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("notifications-sync", { detail: data }));
          }
        })
        .catch(() => {});
    };

    pollNotifications();
    const notifInterval = setInterval(pollNotifications, 5000);
    const unsubscribeRealtime = subscribeToRealtime(() => pollNotifications());
    const onWindowFocus = () => pollNotifications();
    window.addEventListener("focus", onWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(notifInterval);
      unsubscribeRealtime();
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [router]);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (typeof e.detail?.unreadCount === "number") {
        setUnreadNotifs(e.detail.unreadCount);
      }
    };
    window.addEventListener("notifications-sync", handleSync);
    return () => window.removeEventListener("notifications-sync", handleSync);
  }, []);

  const handleLogout = async () => {
    cachedStudentUser = null;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/student/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Projects", href: "/student/projects", icon: FolderGit2 },
    { label: "Payments", href: "/student/payments", icon: CreditCard },
  ];

  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  if (checkingAuth) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <span className="text-xs font-medium">Verifying authorization...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Top instant navigation loading bar */}
      {navigatingTo && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 z-50 animate-pulse shadow-sm shadow-indigo-500/50" />
      )}

      {/* Sidebar for Desktop - Locked stable, zero slide effect */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 flex-shrink-0 h-full">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100 flex-shrink-0">
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
        <div className="p-3 flex-shrink-0">
          <Link
            href="/student/projects/new"
            prefetch={false}
            onMouseEnter={() => router.prefetch("/student/projects/new")}
            onClick={() => setNavigatingTo("/student/projects/new")}
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
            const isTarget = navigatingTo === item.href;
            const active =
              isTarget ||
              (!navigatingTo &&
                (pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href + "/"))));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onMouseEnter={() => router.prefetch(item.href)}
                onClick={(e) => {
                  if (pathname === item.href) {
                    e.preventDefault();
                    return;
                  }
                  setNavigatingTo(item.href);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                } ${isTarget ? "ring-1 ring-indigo-300 opacity-90" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-400"} ${isTarget ? "animate-spin" : ""}`} />
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
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

      {/* Main Area - Only this container scrolls, sidebar stays completely fixed */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {title || "Student Dashboard"}
              </h1>
              {subtitle && <p className="text-xs text-slate-500 hidden sm:block truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
