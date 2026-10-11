"use client";

import { budgetLabel } from "@/lib/format";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layouts/StudentLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  FolderGit2,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  Building,
  DollarSign,
} from "lucide-react";

let cachedProjects: any[] = [];
let cachedTotalPages = 1;

export default function StudentProjectsPage() {
  const [projects, setProjects] = useState<any[]>(cachedProjects);
  const [loading, setLoading] = useState(cachedProjects.length === 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(cachedTotalPages);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, page]);

  const fetchProjects = async () => {
    if (cachedProjects.length === 0) {
      setLoading(true);
    }
    try {
      let url = "/api/projects";
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);
      params.append("page", String(page));
      params.append("limit", "10");
      url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      const list = data.projects || [];
      const total = data.pagination?.totalPages || 1;
      cachedProjects = list;
      cachedTotalPages = total;
      setProjects(list);
      setTotalPages(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) setPage(1);
    else fetchProjects();
  };

  return (
    <StudentLayout
      title="My Campus Projects"
      subtitle="View, track and monitor all student projects you have brought to the company"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-xs md:max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name, ID, or client..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="flex-1 sm:flex-none px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs min-w-0"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="QUOTATION_SENT">Quotation Sent</option>
            <option value="APPROVED">Approved</option>
            <option value="WORKING">Working / Development</option>
            <option value="TESTING">Testing</option>
            <option value="CLIENT_REVIEW">Client Review</option>
            <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <Link
            href="/student/projects/new"
            prefetch={true}
            className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-200 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Project</span>
          </Link>
        </div>
      </div>

      {/* Projects Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No projects found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven&apos;t submitted any projects matching your filter yet.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {projects.map((proj) => (
                <div key={proj._id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {proj.projectId}
                    </span>
                    <StatusBadge status={proj.status} size="sm" />
                  </div>

                  <h4 className="font-semibold text-slate-900 text-sm mb-1 leading-snug">
                    {proj.projectName}
                  </h4>

                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 flex-wrap">
                    <span>{proj.clientName}</span>
                    {proj.collegeName && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400 truncate">{proj.collegeName}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {proj.projectType}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(proj.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Link
                      href={`/student/projects/${proj._id}`}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 text-xs"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) - Fits 100% width with NO horizontal slider */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Budget</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {projects.map((proj) => (
                    <tr key={proj._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-xs">
                          {proj.projectName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="text-indigo-600 font-medium">{proj.projectId}</span>
                          <span>•</span>
                          <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[180px]">
                          {proj.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {proj.clientEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {proj.projectType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {budgetLabel(proj)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={proj.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/student/projects/${proj._id}`}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 text-xs"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
