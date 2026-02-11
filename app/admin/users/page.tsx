"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Copy, Link2, RefreshCw, Users } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  invited_at: string | null;
  trainerize_id: string | null;
  client_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingLinkFor, setGeneratingLinkFor] = useState<string | null>(null);
  const [loginLink, setLoginLink] = useState<{ userId: string; link: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateLoginLink = async (userId: string) => {
    setGeneratingLinkFor(userId);
    setLoginLink(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/login-link`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate link");
      setLoginLink({ userId, link: data.loginLink });
      toast.success("Login link generated");
    } catch (error) {
      console.error("Error generating login link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate link");
    } finally {
      setGeneratingLinkFor(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "completed":
        return <span className={`${base} bg-green-100 text-green-700`}>Active</span>;
      case "invited":
        return <span className={`${base} bg-yellow-100 text-yellow-700`}>Invited</span>;
      case "credentials_setup":
        return <span className={`${base} bg-blue-100 text-blue-700`}>Setting Up</span>;
      case "clients_imported":
        return <span className={`${base} bg-blue-100 text-blue-700`}>Importing</span>;
      case "pending":
        return <span className={`${base} bg-gray-100 text-gray-700`}>Pending</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-700`}>{status}</span>;
    }
  };

  // Filter out admin users — show only coaches
  const coaches = users.filter((u) => !u.is_admin);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Coach Accounts</h2>
          <span className="text-sm text-gray-500">({coaches.length})</span>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchUsers(); }}
          className="btn-ghost px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {coaches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No coach accounts yet. Use the Setup page to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Coach
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Clients
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Trainerize
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Created
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide py-3 px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {user.full_name || "—"}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user.onboarding_status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900 font-medium">
                          {user.client_count}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.trainerize_id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <Link2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not connected</span>
                        )}
                      </td>
                      <td className="text-sm text-gray-500 py-3 px-4">
                        {formatDate(user.invited_at || user.onboarding_completed_at)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => generateLoginLink(user.id)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          disabled={generatingLinkFor === user.id}
                        >
                          {generatingLinkFor === user.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          Login Link
                        </button>
                      </td>
                    </tr>
                    {/* Show login link inline below the row */}
                    {loginLink?.userId === user.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1.5 flex-1 overflow-x-auto">
                              {loginLink.link}
                            </code>
                            <button
                              onClick={() => copyToClipboard(loginLink.link)}
                              className="btn-primary p-2 rounded-lg shrink-0"
                              title="Copy link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Share this link with the coach. It will expire after a short time.
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
