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
}

export function InvitesTable({ invites, onRevoke }: InvitesTableProps) {
  if (invites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No invites yet. Create your first invite to get started.</p>
      </div>
    );
  }

  const getStatusBadge = (status: Invite["status"], expiresAt: string) => {
    // Check if pending but expired
    if (status === "pending" && new Date(expiresAt) < new Date()) {
      return <span className="badge badge-warning badge-sm">Expired</span>;
    }

    switch (status) {
      case "pending":
        return <span className="badge badge-info badge-sm">Pending</span>;
      case "accepted":
        return <span className="badge badge-success badge-sm">Accepted</span>;
      case "expired":
        return <span className="badge badge-warning badge-sm">Expired</span>;
      case "revoked":
        return <span className="badge badge-error badge-sm">Revoked</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
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
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Created</th>
            <th>Expires</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id}>
              <td>
                <div>
                  <div className="font-medium">{invite.email}</div>
                  {invite.metadata?.coachName && (
                    <div className="text-sm text-gray-400">
                      {String(invite.metadata.coachName)}
                    </div>
                  )}
                </div>
              </td>
              <td>{getStatusBadge(invite.status, invite.expires_at)}</td>
              <td className="text-sm text-gray-400">
                {formatDate(invite.created_at)}
              </td>
              <td className="text-sm text-gray-400">
                {invite.status === "accepted"
                  ? invite.accepted_at
                    ? `Accepted ${formatDate(invite.accepted_at)}`
                    : "Accepted"
                  : formatDate(invite.expires_at)}
              </td>
              <td>
                {invite.status === "pending" &&
                  new Date(invite.expires_at) > new Date() && (
                    <button
                      onClick={() => onRevoke(invite.id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      Revoke
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
