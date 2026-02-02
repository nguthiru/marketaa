"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  usageStats: {
    projectCount: number;
    leadCount: number;
    emailsGeneratedThisMonth: number;
  } | null;
  _count: {
    ownedProjects: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page, planFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const getPlanBadgeColor = (plan: string | undefined) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-100 text-purple-700";
      case "pro":
        return "bg-blue-100 text-blue-700";
      case "starter":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Admin Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-600 mt-1">Manage user accounts and subscriptions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No users found</div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Plan</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Usage</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Joined</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{user.name || "No name"}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPlanBadgeColor(user.subscription?.plan)}`}>
                          {user.subscription?.plan || "free"}
                        </span>
                        {user.subscription?.status !== "active" && user.subscription?.status && (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 ml-1">
                            {user.subscription.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-600">
                          <p>{user.usageStats?.projectCount || 0} projects</p>
                          <p>{user.usageStats?.leadCount || 0} leads</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.role === "admin" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-sm text-teal-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
