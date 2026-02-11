"use client";

import { useState, useEffect } from "react";
import { InviteForm } from "@/components/admin/InviteForm";
import { InvitesTable } from "@/components/admin/InvitesTable";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  metadata: Record<string, unknown>;
}

export default function AdminPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const fetchInvites = async () => {
    try {
      const response = await fetch("/api/admin/invites");
      if (!response.ok) throw new Error("Failed to fetch invites");
      const data = await response.json();
      setInvites(data.invites || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error("Failed to load invites");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleInviteCreated = (inviteUrl: string) => {
    setLastInviteUrl(inviteUrl);
    fetchInvites();
  };

  const handleRevoke = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invites/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke invite");
      }

      toast.success("Invite revoked");
      fetchInvites();
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke invite"
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invites/${id}?permanent=true`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete invite");
      }

      toast.success("Invite deleted");
      fetchInvites();
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete invite"
      );
    }
  };

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Invite URL copied to clipboard");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Invite Management
        </h2>
        <p className="text-gray-500">
          Create and manage coach invitations for FitReport.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Invite Form */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Invite
            </h3>
            <InviteForm onSuccess={handleInviteCreated} />

            {lastInviteUrl && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-2">
                  Invite created successfully!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={lastInviteUrl}
                    className="input-field text-sm flex-1"
                  />
                  <button
                    onClick={() => copyInviteUrl(lastInviteUrl)}
                    className="btn-primary px-3 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this URL with the coach. It expires in 48 hours.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Invites Table */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              All Invites
            </h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <InvitesTable invites={invites} onRevoke={handleRevoke} onDelete={handleDelete} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
