"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Award,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  ChevronRight,
  Shield,
  Layers,
  Loader2,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

let cachedAdminUser: any = null;

export function clearAdminAuthCache() {
  cachedAdminUser = null;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(cachedAdminUser);
  const [checkingAuth, setCheckingAuth] = useState(!cachedAdminUser);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me?portal=admin")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          if (data.user.role !== "ADMIN") {
            router.push("/student/dashboard");
            return;
          }
          cachedAdminUser = data.user;
          setUser(data.user);
          setCheckingAuth(false);
        } else {
          cachedAdminUser = null;
          router.push("/admin/login");
        }
      })
      .catch(() => {
        if (isMounted) {
          cachedAdminUser = null;
          router.push("/admin/login");
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
    const onWindowFocus = () => pollNotifications();
    window.addEventListener("focus", onWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(notifInterval);
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
    cachedAdminUser = null;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/admin/projects", icon: FolderGit2 },
    { label: "Ambassadors", href: "/admin/ambassadors", icon: Award },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
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
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 h-full">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white tracking-tight text-sm">Admin Panel</div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isTarget = navigatingTo === item.href;
            const active =
              isTarget ||
              (!navigatingTo && (pathname === item.href || pathname.startsWith(item.href + "/")));
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                } ${isTarget ? "ring-1 ring-indigo-400 opacity-90" : ""}`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"} ${isTarget ? "animate-spin" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin User info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
              {user?.name?.slice(0, 2).toUpperCase() || "AD"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{user?.name || "Administrator"}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email || "admin@company.com"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Only this container scrolls, sidebar stays completely fixed */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title || "Admin Dashboard"}</h1>
              {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Link
                href="/admin/notifications"
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative block transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                )}
              </Link>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Super Admin
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Admin Panel</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                        active ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 bg-rose-950/20 border border-rose-900/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
