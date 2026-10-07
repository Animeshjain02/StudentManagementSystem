"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { History, Shield, User, Clock, ArrowRight, Filter } from "lucide-react";

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = "/api/activity-logs?limit=100";
      if (roleFilter) url += `&role=${roleFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [roleFilter]);

  return (
    <AdminLayout
      title="Immutable Audit & Activity Trail"
      subtitle="Cryptographically tracked operational event logs for compliance and accountability"
    >
      <div className="flex justify-between items-center mb-6">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-2xs max-w-xs"
        >
          <option value="">All Actors (Admin & Ambassadors)</option>
          <option value="ADMIN">Admin Actions Only</option>
          <option value="STUDENT">Student Ambassador Actions Only</option>
        </select>

        <span className="text-xs text-slate-500 font-medium">{logs.length} Logged Audit Events</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No activity logs recorded.</div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div key={log._id} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-b-0 text-xs">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                    log.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {log.role === "ADMIN" ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="font-semibold text-slate-900 leading-snug">{log.description}</p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{log.userId?.name || "User"}</span>
                    <span>&bull;</span>
                    <span className="font-mono text-indigo-600 font-medium">
                      Action: {log.action}
                    </span>
                    {log.entityId && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-600">ID: {log.entityId}</span>
                      </>
                    )}
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
