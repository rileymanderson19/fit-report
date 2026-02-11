"use client";

import { formatDistanceToNow } from "date-fns";

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  metadata: Record<string, unknown>;
}

interface InvitesTableProps {
  invites: Invite[];
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InvitesTable({ invites, onRevoke, onDelete }: InvitesTableProps) {
  if (invites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No invites yet. Create your first invite to get started.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Invite["status"], expiresAt: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    // Check if pending but expired
    if (status === "pending" && new Date(expiresAt) < new Date()) {
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>Expired</span>;
    }

    switch (status) {
      case "pending":
        return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>Pending</span>;
      case "accepted":
        return <span className={`${baseClasses} bg-green-100 text-green-700`}>Accepted</span>;
      case "expired":
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>Expired</span>;
      case "revoked":
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Revoked</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-700`}>{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">Email</th>
            <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">Status</th>
            <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">Created</th>
            <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">Expires</th>
            <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-gray-900">{invite.email}</div>
                  {invite.metadata?.coachName && (
                    <div className="text-sm text-gray-500">
                      {String(invite.metadata.coachName)}
                    </div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">{getStatusBadge(invite.status, invite.expires_at)}</td>
              <td className="text-sm text-gray-500 py-3 px-4">
                {formatDate(invite.created_at)}
              </td>
              <td className="text-sm text-gray-500 py-3 px-4">
                {invite.status === "accepted"
                  ? invite.accepted_at
                    ? `Accepted ${formatDate(invite.accepted_at)}`
                    : "Accepted"
                  : formatDate(invite.expires_at)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {invite.status === "pending" &&
                    new Date(invite.expires_at) > new Date() && (
                      <button
                        onClick={() => onRevoke(invite.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  <button
                    onClick={() => onDelete(invite.id)}
                    className="text-sm text-gray-400 hover:text-red-600 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
