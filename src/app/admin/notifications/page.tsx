"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import {
  Bell,
  CheckCheck,
  FileSpreadsheet,
  CreditCard,
  FolderGit2,
  Users,
  ArrowRight,
} from "lucide-react";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();

    // Real-time polling every 4 seconds
    const interval = setInterval(fetchNotifs, 4000);

    // Sync listener from AdminLayout
    const handleSync = (e: any) => {
      if (e.detail?.notifications) {
        setNotifications(e.detail.notifications);
      }
    };
    window.addEventListener("notifications-sync", handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-sync", handleSync);
    };
  }, []);

  const markAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications", { method: "POST" });
    } catch {}
    fetchNotifs();
  };

  const handleNotificationClick = (notif: any) => {
    // 1. Optimistic instant read update
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      fetch(`/api/notifications/${notif._id}`, { method: "PATCH" }).catch(() => {});
    }

    // 2. Fast immediate redirection to the project or target option
    const targetUrl =
      notif.targetUrl ||
      (notif.relatedEntityId ? `/admin/projects/${notif.relatedEntityId}` : "/admin/projects");
    router.push(targetUrl);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AdminLayout
      title="Admin Notification Center"
      subtitle="Real-time alerts for project submissions, quotation responses, and payments"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {unreadCount} Unread Notifications
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Updates
            </span>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Admin notifications for project submissions, payments, and approvals will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group p-4 rounded-xl border transition-all cursor-pointer relative ${
                  notif.isRead
                    ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                    : "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/10 shadow-xs hover:bg-indigo-50 hover:border-indigo-300"
                }`}
                title="Click to view details"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                        notif.type === "QUOTATION"
                          ? "bg-blue-100 text-blue-700"
                          : notif.type === "PAYMENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : notif.type === "PROJECT"
                          ? "bg-purple-100 text-purple-700"
                          : notif.type === "STUDENT"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {notif.type === "QUOTATION" ? (
                        <FileSpreadsheet className="w-4 h-4" />
                      ) : notif.type === "PAYMENT" ? (
                        <CreditCard className="w-4 h-4" />
                      ) : notif.type === "STUDENT" ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <FolderGit2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span suppressHydrationWarning>
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform self-center sm:self-auto pt-1">
                    <span className="hidden sm:inline text-[11px]">View</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
