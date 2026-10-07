"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Bell, CheckCheck, FileSpreadsheet, CreditCard, FolderGit2 } from "lucide-react";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "POST" });
    fetchNotifs();
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    fetchNotifs();
  };

  return (
    <AdminLayout
      title="Admin Notification Center"
      subtitle="Real-time alerts for project submissions, quotation responses, and payments"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-semibold text-slate-500">
            {notifications.filter((n) => !n.isRead).length} Unread Notifications
          </span>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && markRead(notif._id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? "bg-white border-slate-200"
                    : "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/10 shadow-2xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notif.type === "QUOTATION"
                          ? "bg-blue-100 text-blue-700"
                          : notif.type === "PAYMENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : notif.type === "PROJECT"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {notif.type === "QUOTATION" ? (
                        <FileSpreadsheet className="w-4 h-4" />
                      ) : notif.type === "PAYMENT" ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <FolderGit2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
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
